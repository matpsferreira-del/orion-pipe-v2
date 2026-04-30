// Edge function: pathly-pull
// Para cada outplacement_project com pathly_plan_id:
//   1. Busca todos os contatos do Pathly via list_plan_data (exclui source='orion')
//   2. Novos contatos → INSERT em outplacement_contacts
//   3. Contatos existentes → UPDATE kanban_stage se mudou; limpa pathly_removed_at se voltou
//   4. Contatos que sumiram do Pathly → marca pathly_removed_at (soft delete)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
  if (!PATHLY_FUNCTIONS_URL || !ORION_BRIDGE_SECRET) throw new Error("Pathly secrets not configured");
  const target = `${PATHLY_FUNCTIONS_URL.replace(/\/+$/, "")}/orion-bridge`;
  const resp = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-orion-secret": ORION_BRIDGE_SECRET },
    body: JSON.stringify({ action, payload }),
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { error: text }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: projects, error: projErr } = await supabase
    .from("outplacement_projects")
    .select("id, pathly_plan_id")
    .not("pathly_plan_id", "is", null);

  if (projErr) return json({ error: projErr.message }, 500);

  const summary = {
    projects: projects?.length ?? 0,
    contacts_inserted: 0,
    contacts_updated: 0,
    contacts_flagged_removed: 0,
    contacts_reactivated: 0,
    market_jobs_inserted: 0,
    errors: [] as string[],
  };

  const now = new Date().toISOString();

  for (const project of projects ?? []) {
    const planId = project.pathly_plan_id;
    if (!planId) continue;

    try {
      const result = await callBridge("list_plan_data", { plan_id: planId });
      if (result?.error) { summary.errors.push(`plan ${planId}: ${result.error}`); continue; }

      const allContacts: PathlyContact[] = result.contacts ?? [];
      // Exclude contacts pushed by Orion to prevent circular sync
      const pathlyContacts = allContacts.filter((c) => c.source !== "orion");
      const marketJobs: PathlyMarketJob[] = (result.market_jobs ?? []).filter(
        (j: PathlyMarketJob & { source?: string }) => j.source !== "orion",
      );

      // ===== CONTACTS =====
      const { data: existingRaw } = await supabase
        .from("outplacement_contacts")
        .select("id, name, company_name, linkedin_url, kanban_stage, pathly_synced_at, pathly_removed_at")
        .eq("project_id", project.id);

      const existing = existingRaw ?? [];

      // Build lookup maps: normalized key → contact row
      const linkedinToExisting = new Map<string, typeof existing[0]>();
      const nameCompanyToExisting = new Map<string, typeof existing[0]>();
      for (const ec of existing) {
        const lk = (ec.linkedin_url || "").toLowerCase().replace(/\/+$/, "");
        if (lk) linkedinToExisting.set(lk, ec);
        const nk = `${(ec.name || "").toLowerCase().trim()}|${(ec.company_name || "").toLowerCase().trim()}`;
        nameCompanyToExisting.set(nk, ec);
      }

      const matchedOrionIds = new Set<string>();
      const toInsert: Record<string, unknown>[] = [];
      const toUpdateStage: { id: string; kanban_stage: string }[] = [];
      const toReactivate: string[] = [];

      for (const c of pathlyContacts) {
        const linkedinNorm = (c.linkedin_url || "").toLowerCase().replace(/\/+$/, "");
        const nameKey = `${(c.name || "").toLowerCase().trim()}|${(c.company || "").toLowerCase().trim()}`;

        const existingByLinkedin = linkedinNorm ? linkedinToExisting.get(linkedinNorm) : undefined;
        const existingByName = !existingByLinkedin ? nameCompanyToExisting.get(nameKey) : undefined;
        const matched = existingByLinkedin ?? existingByName;

        if (matched) {
          matchedOrionIds.add(matched.id);
          const newStage = STAGE_REVERSE[c.status ?? "identified"] ?? "identificado";
          if (matched.kanban_stage !== newStage) {
            toUpdateStage.push({ id: matched.id, kanban_stage: newStage });
          }
          // If previously flagged as removed but now back in Pathly → reactivate
          if (matched.pathly_removed_at) {
            toReactivate.push(matched.id);
          }
        } else {
          // New contact from Pathly — insert
          toInsert.push({
            project_id: project.id,
            name: c.name,
            current_position: c.current_position ?? null,
            company_name: c.company ?? null,
            linkedin_url: c.linkedin_url ?? null,
            contact_type: TYPE_REVERSE[c.type ?? "other"] ?? "outro",
            tier: c.tier ?? "B",
            kanban_stage: STAGE_REVERSE[c.status ?? "identified"] ?? "identificado",
            notes: c.notes ?? null,
            pathly_synced_at: now,
          });
        }
      }

      // Insert new contacts
      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from("outplacement_contacts").insert(toInsert);
        if (insErr) summary.errors.push(`contacts insert plan ${planId}: ${insErr.message}`);
        else summary.contacts_inserted += toInsert.length;
      }

      // Update kanban_stage for existing contacts whose stage changed in Pathly
      for (const upd of toUpdateStage) {
        const { error: updErr } = await supabase
          .from("outplacement_contacts")
          .update({ kanban_stage: upd.kanban_stage, pathly_synced_at: now })
          .eq("id", upd.id);
        if (updErr) summary.errors.push(`stage update ${upd.id}: ${updErr.message}`);
        else summary.contacts_updated++;
      }

      // Reactivate contacts that came back to Pathly after being removed
      if (toReactivate.length > 0) {
        const { error: reErr } = await supabase
          .from("outplacement_contacts")
          .update({ pathly_removed_at: null, pathly_synced_at: now })
          .in("id", toReactivate);
        if (reErr) summary.errors.push(`reactivate plan ${planId}: ${reErr.message}`);
        else summary.contacts_reactivated += toReactivate.length;
      }

      // Soft-delete: contacts with pathly_synced_at that are no longer in Pathly's list
      const toFlag = existing.filter(
        ec => ec.pathly_synced_at && !ec.pathly_removed_at && !matchedOrionIds.has(ec.id)
      );
      if (toFlag.length > 0) {
        const { error: flagErr } = await supabase
          .from("outplacement_contacts")
          .update({ pathly_removed_at: now })
          .in("id", toFlag.map(ec => ec.id));
        if (flagErr) summary.errors.push(`flag removed plan ${planId}: ${flagErr.message}`);
        else summary.contacts_flagged_removed += toFlag.length;
      }

      // ===== MARKET JOBS =====
      const { data: existingJobs } = await supabase
        .from("outplacement_market_jobs")
        .select("id, job_title, company_name, job_url")
        .eq("project_id", project.id);

      const urlSet = new Set(
        (existingJobs ?? []).map((j) => (j.job_url || "").toLowerCase()).filter(Boolean),
      );
      const titleCompanySet = new Set(
        (existingJobs ?? []).map(
          (j) => `${(j.job_title || "").toLowerCase().trim()}|${(j.company_name || "").toLowerCase().trim()}`,
        ),
      );

      const toInsertJobs: Record<string, unknown>[] = [];
      for (const j of marketJobs) {
        const urlNorm = (j.job_url || "").toLowerCase();
        const titleKey = `${(j.job_title || "").toLowerCase().trim()}|${(j.company_name || "").toLowerCase().trim()}`;
        const dup = (urlNorm && urlSet.has(urlNorm)) || (!urlNorm && titleCompanySet.has(titleKey));
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
          pathly_synced_at: now,
        });

        if (urlNorm) urlSet.add(urlNorm);
        else titleCompanySet.add(titleKey);
      }

      if (toInsertJobs.length > 0) {
        const { error: insJobsErr } = await supabase.from("outplacement_market_jobs").insert(toInsertJobs);
        if (insJobsErr) summary.errors.push(`market_jobs plan ${planId}: ${insJobsErr.message}`);
        else summary.market_jobs_inserted += toInsertJobs.length;
      }
    } catch (e) {
      summary.errors.push(`plan ${planId}: ${(e as Error).message}`);
    }
  }

  console.log("pathly-pull summary", summary);
  return json({ ok: true, summary });
});
