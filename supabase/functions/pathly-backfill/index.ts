// Edge function: pathly-backfill
// Para cada outplacement_project sem pathly_plan_id, cria um plano no Pathly,
// salva o id de volta no Orion e empurra todos os contatos + vagas de mercado
// já existentes desse projeto. Idempotente: pode ser chamada várias vezes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const TYPE_MAP: Record<string, string> = {
  decisor: 'decision_maker', rh: 'hr', recrutador: 'recruiter', indicacao: 'referral', outro: 'other',
};
const STAGE_MAP: Record<string, string> = {
  identificado: 'identified', convite_enviado: 'invite_sent', conectado: 'connected',
  msg_enviada: 'message_sent', respondeu: 'replied', reuniao_agendada: 'meeting_scheduled',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const PATHLY_FUNCTIONS_URL = Deno.env.get('PATHLY_FUNCTIONS_URL');
  const ORION_BRIDGE_SECRET = Deno.env.get('ORION_BRIDGE_SECRET');

  if (!PATHLY_FUNCTIONS_URL || !ORION_BRIDGE_SECRET) {
    return json({ error: 'PATHLY_FUNCTIONS_URL or ORION_BRIDGE_SECRET missing' }, 500);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const bridge = `${PATHLY_FUNCTIONS_URL.replace(/\/+$/, '')}/orion-bridge`;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function callBridge(action: string, payload: unknown, retries = 3): Promise<{ ok: boolean; status: number; data: any }> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const r = await fetch(bridge, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-orion-secret': ORION_BRIDGE_SECRET! },
        body: JSON.stringify({ action, payload }),
      });
      const text = await r.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      // Rate limit -> wait and retry
      if (r.status === 429 || /rate limit/i.test(text)) {
        const waitMs = data?.retryAfterMs || 5000 * (attempt + 1);
        console.log(`[backfill] rate limit on ${action}, waiting ${waitMs}ms`);
        await sleep(Math.min(waitMs, 35000));
        continue;
      }
      return { ok: r.ok && !data?.error, status: r.status, data };
    }
    return { ok: false, status: 429, data: { error: 'rate limit retries exhausted' } };
  }

  // Buscar projetos sem pathly_plan_id
  const { data: projects, error } = await sb
    .from('outplacement_projects')
    .select('id, title, target_role, target_industry, target_location, party_id, pathly_plan_id')
    .is('pathly_plan_id', null);

  if (error) return json({ error: error.message }, 500);

  const report: any[] = [];

  for (const proj of projects ?? []) {
    const entry: any = { project_id: proj.id, title: proj.title };

    // Buscar party (nome/email do mentorado)
    let menteeName = proj.title;
    let menteeEmail: string | null = null;
    if (proj.party_id) {
      const { data: party } = await sb
        .from('party')
        .select('full_name, email_raw')
        .eq('id', proj.party_id)
        .maybeSingle();
      if (party?.full_name) menteeName = party.full_name;
      if (party?.email_raw) menteeEmail = party.email_raw;
    }

    // 1. Cria plano no Pathly
    const planRes = await callBridge('create_plan', {
      mentee_name: menteeName,
      mentee_email: menteeEmail,
      current_position: proj.target_role ?? '',
      current_area: proj.target_industry ?? '',
      target_role: proj.target_role,
      target_location: proj.target_location,
      source: 'orion',
    });

    const planId = planRes.data?.plan?.id;
    if (!planId) {
      entry.error = `create_plan failed: ${JSON.stringify(planRes.data)}`;
      report.push(entry);
      continue;
    }
    entry.plan_id = planId;

    // Salva o pathly_plan_id no Orion
    await sb.from('outplacement_projects').update({
      pathly_plan_id: planId,
      pathly_synced_at: new Date().toISOString(),
    }).eq('id', proj.id);

    // 2. Sincroniza contatos
    const { data: contacts } = await sb
      .from('outplacement_contacts')
      .select('*')
      .eq('project_id', proj.id);

    let contactOk = 0, contactFail = 0;
    for (const c of contacts ?? []) {
      // upsert empresa se houver
      if (c.company_name) {
        await callBridge('upsert_company', {
          plan_id: planId,
          name: c.company_name,
          tier: c.tier ?? 'B',
          has_openings: false,
          source: 'orion',
        });
      }
      const r = await callBridge('upsert_contact', {
        plan_id: planId,
        name: c.name,
        current_position: c.current_position,
        company: c.company_name,
        linkedin_url: c.linkedin_url,
        type: TYPE_MAP[c.contact_type ?? 'outro'] ?? 'other',
        tier: c.tier ?? 'B',
        status: STAGE_MAP[c.kanban_stage ?? 'identificado'] ?? 'identified',
        notes: c.notes,
        source: 'orion',
      });
      if (r.ok) {
        contactOk++;
        await sb.from('outplacement_contacts')
          .update({ pathly_synced_at: new Date().toISOString() })
          .eq('id', c.id);
      } else {
        contactFail++;
      }
      await sleep(250);
    }
    entry.contacts = { ok: contactOk, failed: contactFail, total: contacts?.length ?? 0 };

    // 3. Sincroniza vagas de mercado
    const { data: jobs } = await sb
      .from('outplacement_market_jobs')
      .select('*')
      .eq('project_id', proj.id);

    let jobOk = 0, jobFail = 0;
    for (const j of jobs ?? []) {
      const r = await callBridge('upsert_market_job', {
        plan_id: planId,
        job_title: j.job_title,
        company_name: j.company_name,
        location: j.location,
        job_url: j.job_url,
        source: j.source,
        status: j.status,
        notes: j.notes,
      });
      if (r.ok) {
        jobOk++;
        await sb.from('outplacement_market_jobs')
          .update({ pathly_synced_at: new Date().toISOString() })
          .eq('id', j.id);
      } else {
        jobFail++;
      }
    }
    entry.market_jobs = { ok: jobOk, failed: jobFail, total: jobs?.length ?? 0 };

    report.push(entry);
  }

  return json({ ok: true, projects_processed: report.length, report });
});
