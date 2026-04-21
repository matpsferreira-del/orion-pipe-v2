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

  async function callBridge(action: string, payload: unknown, retries = 2): Promise<{ ok: boolean; status: number; data: any }> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const r = await fetch(bridge, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-orion-secret': ORION_BRIDGE_SECRET! },
          body: JSON.stringify({ action, payload }),
        });
        const text = await r.text();
        let data: any;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
        if (r.status === 429 || /rate limit/i.test(text)) {
          const waitMs = Math.min(data?.retryAfterMs || 3000 * (attempt + 1), 8000);
          console.log(`[backfill] rate limit on ${action}, waiting ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
          await sleep(waitMs);
          continue;
        }
        return { ok: r.ok && !data?.error, status: r.status, data };
      } catch (e) {
        const msg = (e as Error)?.message ?? String(e);
        const match = msg.match(/Retry after (\d+)ms/i);
        const waitMs = Math.min(match ? parseInt(match[1], 10) : 3000 * (attempt + 1), 8000);
        console.log(`[backfill] fetch error on ${action}: ${msg} — waiting ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(waitMs);
        continue;
      }
    }
    return { ok: false, status: 429, data: { error: 'rate limit retries exhausted' } };
  }

  async function safeCall(action: string, payload: unknown) {
    try {
      return await callBridge(action, payload);
    } catch (e) {
      console.log(`[backfill] safeCall caught ${action}:`, (e as Error)?.message);
      return { ok: false, status: 500, data: { error: (e as Error)?.message } };
    }
  }

  // Modo: 'all' (default) processa projetos sem plano E re-sincroniza contatos pendentes
  // de projetos já vinculados; 'plans_only' apenas cria planos faltantes.
  // Suporta project_id (limita a um projeto) e batch_size (limita contatos/vagas por invocação,
  // evitando rate limit do runtime Deno).
  let mode: 'all' | 'plans_only' | 'force' = 'all';
  let onlyProjectId: string | null = null;
  let batchSize = 15;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.mode === 'plans_only' || body?.mode === 'force') mode = body.mode;
    if (typeof body?.project_id === 'string') onlyProjectId = body.project_id;
    if (typeof body?.batch_size === 'number' && body.batch_size > 0 && body.batch_size <= 200) {
      batchSize = body.batch_size;
    }
  } catch { /* ignore */ }

  // Hard time budget per invocation. The platform kills idle requests at 150s,
  // so we stop early and return what was processed; the client loop continues.
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 90_000;
  const timeUp = () => Date.now() - startedAt > TIME_BUDGET_MS;

  let projectsQuery = sb
    .from('outplacement_projects')
    .select('id, title, target_role, target_industry, target_location, party_id, client_email, pathly_plan_id, situacao_atual, modelo_trabalho, estado, cidade, preferencia_regiao, cidades_interesse');
  if (onlyProjectId) projectsQuery = projectsQuery.eq('id', onlyProjectId);
  const { data: projects, error } = await projectsQuery;

  if (error) return json({ error: error.message }, 500);

  const report: any[] = [];

  const SITUACAO_MAP: Record<string, string> = { empregado: 'employed', desempregado: 'unemployed', em_transicao: 'in_transition' };
  const MODELO_MAP: Record<string, string> = { presencial: 'on_site', hibrido: 'hybrid', remoto: 'remote' };
  const REGIAO_MAP: Record<string, string> = { mesma_regiao: 'same_region', outras_regioes: 'other_regions', indiferente: 'any' };

  for (const proj of projects ?? []) {
    if (timeUp()) { report.push({ time_budget_reached: true }); break; }
    const entry: any = { project_id: proj.id, title: proj.title };

    let planId = proj.pathly_plan_id as string | null;

    // Se não tem plano, cria
    if (!planId) {
      // Buscar party (nome/email do mentorado)
      let menteeName = proj.title;
      let menteeEmail: string | null = proj.client_email ?? null;
      if (proj.party_id) {
        const { data: party } = await sb
          .from('party')
          .select('full_name, email_raw')
          .eq('id', proj.party_id)
          .maybeSingle();
        if (party?.full_name) menteeName = party.full_name;
        if (party?.email_raw && !menteeEmail) menteeEmail = party.email_raw;
      }

      const planRes = await callBridge('create_plan', {
        mentee_name: menteeName,
        mentee_email: menteeEmail,
        current_position: proj.target_role ?? '',
        current_area: proj.target_industry ?? '',
        target_role: proj.target_role,
        target_location: proj.target_location,
        employment_status: proj.situacao_atual ? SITUACAO_MAP[proj.situacao_atual] ?? proj.situacao_atual : null,
        work_model: proj.modelo_trabalho ? MODELO_MAP[proj.modelo_trabalho] ?? proj.modelo_trabalho : null,
        state: proj.estado ?? null,
        city: proj.cidade ?? null,
        region_preference: proj.preferencia_regiao ? REGIAO_MAP[proj.preferencia_regiao] ?? proj.preferencia_regiao : null,
        cities_of_interest: proj.cidades_interesse ?? [],
        source: 'orion',
      });

      planId = planRes.data?.plan?.id ?? null;
      if (!planId) {
        entry.error = `create_plan failed: ${JSON.stringify(planRes.data)}`;
        report.push(entry);
        continue;
      }
      entry.plan_created = true;

      await sb.from('outplacement_projects').update({
        pathly_plan_id: planId,
        pathly_synced_at: new Date().toISOString(),
      }).eq('id', proj.id);
    } else {
      entry.plan_existing = true;
    }

    entry.plan_id = planId;

    if (mode === 'plans_only') {
      report.push(entry);
      continue;
    }

    // 2. Sincroniza contatos (em modo padrão, apenas pendentes; em 'force', todos)
    // Limitado a batchSize por invocação para evitar rate limit do runtime Deno.
    let contactsQuery = sb.from('outplacement_contacts').select('*').eq('project_id', proj.id).order('created_at', { ascending: true });
    if (mode !== 'force') contactsQuery = contactsQuery.is('pathly_synced_at', null);
    contactsQuery = contactsQuery.limit(batchSize);
    const { data: contacts } = await contactsQuery;

    let contactOk = 0, contactFail = 0;
    for (const c of contacts ?? []) {
      if (timeUp()) break;
      try {
        if (c.company_name) {
          await safeCall('upsert_company', {
            plan_id: planId,
            name: c.company_name,
            tier: c.tier ?? 'B',
            has_openings: false,
            source: 'orion',
          });
          await sleep(150);
        }
        const r = await safeCall('upsert_contact', {
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
          console.log(`[backfill] contact ${c.id} failed:`, JSON.stringify(r.data).slice(0, 200));
        }
      } catch (e) {
        contactFail++;
        console.log(`[backfill] contact ${c.id} threw:`, (e as Error)?.message);
      }
      await sleep(200);
    }
    entry.contacts = { ok: contactOk, failed: contactFail, total: contacts?.length ?? 0 };

    if (timeUp()) {
      entry.time_budget_reached = true;
      report.push(entry);
      break;
    }

    // 3. Sincroniza vagas de mercado (apenas pendentes em modo padrão), também limitado.
    let jobsQuery = sb.from('outplacement_market_jobs').select('*').eq('project_id', proj.id).order('created_at', { ascending: true });
    if (mode !== 'force') jobsQuery = jobsQuery.is('pathly_synced_at', null);
    jobsQuery = jobsQuery.limit(batchSize);
    const { data: jobs } = await jobsQuery;

    let jobOk = 0, jobFail = 0;
    for (const j of jobs ?? []) {
      if (timeUp()) break;
      try {
        const r = await safeCall('upsert_market_job', {
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
      } catch (e) {
        jobFail++;
        console.log(`[backfill] market_job ${j.id} threw:`, (e as Error)?.message);
      }
      await sleep(150);
    }
    entry.market_jobs = { ok: jobOk, failed: jobFail, total: jobs?.length ?? 0 };

    report.push(entry);
  }

  return json({ ok: true, projects_processed: report.length, report });
});
