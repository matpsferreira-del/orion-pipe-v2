// Edge function: pathly-pull
// Polling reverso: chamado a cada 30s via pg_cron.
// Para cada outplacement_project com pathly_plan_id, busca contatos,
// empresas e vagas do Pathly via bridge `list_plan_data` e faz UPSERT
// no Orion. Estratégia: "Orion sempre ganha" — só insere registros que
// ainda não existem (chave: linkedin_url para contatos, job_url para
// vagas, ou name+company como fallback). Não sobrescreve dados existentes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Reverse mapping (Pathly -> Orion vocabulary)
const TYPE_REVERSE: Record<string, string> = {
  decision_maker: "decisor",
  hr: "rh",
  other: "outro",
};
const STAGE_REVERSE: Record<string, string> = {
  identified: "identificado",
  connection_sent: "convite_enviado",
  connected: "conectado",
  message_sent: "msg_enviada",
  replied: "respondeu",
  meeting_scheduled: "reuniao_agendada",
};

interface PathlyContact {
  id: string;
  name: string;
  current_position: string | null;
  company: string | null;
  linkedin_url: string | null;
  type: string | null;
  tier: string | null;
  status: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
}
interface PathlyMarketJob {
  id: string;
  job_title: string;
  company_name: string;
  location: string | null;
  job_url: string | null;
  source: string | null;
  status: string | null;
  notes: string | null;
}

async function callBridge(action: string, payload: Record<string, unknown>) {
  const PATHLY_FUNCTIONS_URL = Deno.env.get("PATHLY_FUNCTIONS_URL");
  const ORION_BRIDGE_SECRET = Deno.env.get("ORION_BRIDGE_SECRET");
  if (!PATHLY_FUNCTIONS_URL || !ORION_BRIDGE_SECRET) {
    throw new Error("Pathly secrets not configured");
  }
  const target = `${PATHLY_FUNCTIONS_URL.replace(/\/+$/, "")}/orion-bridge`;
  const resp = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-orion-secret": ORION_BRIDGE_SECRET,
    },
    body: JSON.stringify({ action, payload }),
  });
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Pega todos os projetos vinculados ao Pathly
  const { data: projects, error: projErr } = await supabase
    .from("outplacement_projects")
    .select("id, pathly_plan_id")
    .not("pathly_plan_id", "is", null);

  if (projErr) {
    console.error("Failed to load projects", projErr);
    return json({ error: projErr.message }, 500);
  }

  const summary = {
    projects: projects?.length ?? 0,
    contacts_inserted: 0,
    market_jobs_inserted: 0,
    errors: [] as string[],
  };

  for (const project of projects ?? []) {
    const planId = project.pathly_plan_id;
    if (!planId) continue;

    try {
      const result = await callBridge("list_mentee_contributions", { plan_id: planId });
      if (result?.error) {
        summary.errors.push(`plan ${planId}: ${result.error}`);
        continue;
      }

      const contacts: PathlyContact[] = result.contacts ?? [];
      const marketJobs: PathlyMarketJob[] = [];

      // ===== CONTACTS =====
      // Carrega contatos existentes do projeto para deduplicar
      const { data: existingContacts } = await supabase
        .from("outplacement_contacts")
        .select("id, name, company_name, linkedin_url")
        .eq("project_id", project.id);

      const linkedinSet = new Set(
        (existingContacts ?? [])
          .map((c) => (c.linkedin_url || "").toLowerCase().replace(/\/+$/, ""))
          .filter(Boolean),
      );
      const nameCompanySet = new Set(
        (existingContacts ?? []).map(
          (c) =>
            `${(c.name || "").toLowerCase().trim()}|${(c.company_name || "").toLowerCase().trim()}`,
        ),
      );

      const toInsertContacts: Record<string, unknown>[] = [];
      for (const c of contacts) {
        const linkedinNorm = (c.linkedin_url || "").toLowerCase().replace(/\/+$/, "");
        const nameKey = `${(c.name || "").toLowerCase().trim()}|${(c.company || "").toLowerCase().trim()}`;
        const dup = (linkedinNorm && linkedinSet.has(linkedinNorm)) ||
          (!linkedinNorm && nameCompanySet.has(nameKey));
        if (dup) continue;

        toInsertContacts.push({
          project_id: project.id,
          name: c.name,
          current_position: c.current_position ?? null,
          company_name: c.company ?? null,
          linkedin_url: c.linkedin_url ?? null,
          contact_type: TYPE_REVERSE[c.type ?? "other"] ?? "outro",
          tier: c.tier ?? "B",
          kanban_stage: STAGE_REVERSE[c.status ?? "identified"] ?? "identificado",
          notes: c.notes ?? null,
          pathly_synced_at: new Date().toISOString(),
        });

        if (linkedinNorm) linkedinSet.add(linkedinNorm);
        else nameCompanySet.add(nameKey);
      }

      if (toInsertContacts.length > 0) {
        const { error: insErr } = await supabase
          .from("outplacement_contacts")
          .insert(toInsertContacts);
        if (insErr) {
          summary.errors.push(`contacts plan ${planId}: ${insErr.message}`);
        } else {
          summary.contacts_inserted += toInsertContacts.length;
        }
      }

      // ===== MARKET JOBS =====
      const { data: existingJobs } = await supabase
        .from("outplacement_market_jobs")
        .select("id, job_title, company_name, job_url")
        .eq("project_id", project.id);

      const urlSet = new Set(
        (existingJobs ?? [])
          .map((j) => (j.job_url || "").toLowerCase())
          .filter(Boolean),
      );
      const titleCompanySet = new Set(
        (existingJobs ?? []).map(
          (j) =>
            `${(j.job_title || "").toLowerCase().trim()}|${(j.company_name || "").toLowerCase().trim()}`,
        ),
      );

      const toInsertJobs: Record<string, unknown>[] = [];
      for (const j of marketJobs) {
        const urlNorm = (j.job_url || "").toLowerCase();
        const titleKey = `${(j.job_title || "").toLowerCase().trim()}|${(j.company_name || "").toLowerCase().trim()}`;
        const dup = (urlNorm && urlSet.has(urlNorm)) ||
          (!urlNorm && titleCompanySet.has(titleKey));
        if (dup) continue;

        toInsertJobs.push({
          project_id: project.id,
          job_title: j.job_title,
          company_name: j.company_name,
          location: j.location ?? null,
          job_url: j.job_url ?? null,
          source: j.source ?? null,
          status: j.status ?? "identificada",
          notes: j.notes ?? null,
          pathly_synced_at: new Date().toISOString(),
        });

        if (urlNorm) urlSet.add(urlNorm);
        else titleCompanySet.add(titleKey);
      }

      if (toInsertJobs.length > 0) {
        const { error: insJobsErr } = await supabase
          .from("outplacement_market_jobs")
          .insert(toInsertJobs);
        if (insJobsErr) {
          summary.errors.push(`market_jobs plan ${planId}: ${insJobsErr.message}`);
        } else {
          summary.market_jobs_inserted += toInsertJobs.length;
        }
      }
    } catch (e) {
      summary.errors.push(`plan ${planId}: ${(e as Error).message}`);
    }
  }

  console.log("pathly-pull summary", summary);
  return json({ ok: true, summary });
});
