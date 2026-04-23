import { supabase } from '@/integrations/supabase/client';

type CityPreference = { estado: string; cidade: string };

const PATHLY_CONTACT_TYPE_MAP: Record<string, string> = {
  decisor: 'decision_maker',
  rh: 'hr',
  recrutador: 'other',
  indicacao: 'other',
  outro: 'other',
};

const PATHLY_CONTACT_STATUS_MAP: Record<string, string> = {
  identificado: 'identified',
  convite_enviado: 'connection_sent',
  conectado: 'connected',
  msg_enviada: 'message_sent',
  respondeu: 'replied',
  reuniao_agendada: 'meeting_scheduled',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getRetryDelay(error: string | null, attempt: number) {
  const match = error?.match(/retry after\s+(\d+)ms/i);
  if (match) return Math.min(Number(match[1]), 4000);
  return Math.min(500 * 2 ** attempt, 4000);
}

async function callPathlyWithRetry(
  action: string,
  payload: Record<string, unknown> = {},
  retries = 3,
) {
  let lastResult: Awaited<ReturnType<typeof callPathly>> = { ok: false, error: 'Unknown error', data: null };

  for (let attempt = 0; attempt < retries; attempt++) {
    lastResult = await callPathly(action, payload);
    if (lastResult.ok) return lastResult;

    const shouldRetry = /rate limit|429|502|gateway/i.test(lastResult.error || '');
    if (!shouldRetry || attempt === retries - 1) return lastResult;

    await sleep(getRetryDelay(lastResult.error, attempt));
  }

  return lastResult;
}

function mapContactTypeToPathly(contactType?: string | null) {
  return PATHLY_CONTACT_TYPE_MAP[contactType ?? 'outro'] ?? 'other';
}

function mapContactStatusToPathly(stage?: string | null) {
  return PATHLY_CONTACT_STATUS_MAP[stage ?? 'identificado'] ?? 'identified';
}

function pickCompanyTier(current: string | null | undefined, next: string | null | undefined) {
  const rank: Record<string, number> = { A: 3, B: 2, C: 1 };
  if (!current) return next ?? 'B';
  if (!next) return current;
  return rank[next] > rank[current] ? next : current;
}

function normalizeCityPreferences(value: unknown): CityPreference[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      estado: typeof item.estado === 'string' ? item.estado : '',
      cidade: typeof item.cidade === 'string' ? item.cidade : '',
    }))
    .filter((item) => item.estado && item.cidade);
}

/**
 * Helper para invocar a edge function pathly-sync (proxy para a bridge
 * orion-bridge do projeto Pathly). Sempre retorna { ok, data, error }.
 *
 * Falhas NÃO devem quebrar o fluxo principal — sync é best-effort.
 */
export async function callPathly(action: string, payload: Record<string, unknown> = {}) {
  try {
    const { data, error } = await supabase.functions.invoke('pathly-sync', {
      body: { action, payload },
    });
    if (error) {
      console.warn(`[pathly-sync] ${action} failed:`, error.message);
      return { ok: false, error: error.message, data: null };
    }
    if (data?.error) {
      console.warn(`[pathly-sync] ${action} bridge error:`, data.error);
      return { ok: false, error: data.error, data };
    }
    return { ok: true, data, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.warn(`[pathly-sync] ${action} threw:`, msg);
    return { ok: false, error: msg, data: null };
  }
}

// ----- Action wrappers -----

export interface PathlyPlanSummary {
  id: string;
  mentee_name: string;
  mentee_email: string | null;
  status: string;
  orionpipe_client_id: string | null;
  current_position: string | null;
  current_area: string | null;
  state: string | null;
  city: string | null;
  updated_at: string;
  created_at: string;
}

export async function listPathlyPlans(status = 'completed'): Promise<PathlyPlanSummary[]> {
  const r = await callPathly('list_active_plans', { status });
  return r.ok ? (r.data?.plans ?? []) : [];
}

export async function syncContactToPathly(planId: string, contact: {
  name: string;
  current_position?: string | null;
  company_name?: string | null;
  linkedin_url?: string | null;
  contact_type?: string;
  tier?: string;
  kanban_stage?: string;
  notes?: string | null;
}) {
  if (contact.company_name) {
    await callPathlyWithRetry('upsert_company', {
      plan_id: planId,
      name: contact.company_name,
      tier: contact.tier ?? 'B',
      has_openings: false,
      source: 'orion',
    });
  }

  return callPathlyWithRetry('upsert_contact', {
    plan_id: planId,
    name: contact.name,
    current_position: contact.current_position ?? null,
    company: contact.company_name ?? null,
    linkedin_url: contact.linkedin_url ?? null,
    type: mapContactTypeToPathly(contact.contact_type),
    tier: contact.tier ?? 'B',
    status: mapContactStatusToPathly(contact.kanban_stage),
    notes: contact.notes ?? null,
    source: 'orion',
  });
}

export async function syncMarketJobToPathly(planId: string, job: {
  job_title: string;
  company_name: string;
  location?: string | null;
  job_url?: string | null;
  source?: string | null;
  status?: string;
  notes?: string | null;
}) {
  return callPathlyWithRetry('upsert_market_job', {
    plan_id: planId,
    job_title: job.job_title,
    company_name: job.company_name,
    location: job.location ?? null,
    job_url: job.job_url ?? null,
    source: job.source ?? null,
    status: job.status ?? 'identificada',
    notes: job.notes ?? null,
  });
}

export async function createPathlyPlan(project: {
  id?: string;
  title: string;
  party_name?: string | null;
  party_email?: string | null;
  target_role?: string | null;
  target_industry?: string | null;
  target_location?: string | null;
  // Novos campos alinhados ao formulário do Pathly
  situacao_atual?: string | null;
  modelo_trabalho?: string | null;
  estado?: string | null;
  cidade?: string | null;
  preferencia_regiao?: string | null;
  cidades_interesse?: Array<{ estado: string; cidade: string }> | null;
}) {
  // Mapeamento Orion -> Pathly (vocabulário direto do schema do Pathly)
  // employment_status NÃO existe em mentorship_plans do Pathly — enviado para
  // log/extensibilidade futura, ignorado pela bridge atual.
  const situacaoMap: Record<string, string> = {
    empregado: 'employed',
    desempregado: 'unemployed',
    em_transicao: 'in_transition',
  };
  // work_model do Pathly aceita: presencial | hibrido | remoto (PT-BR)
  const modeloMap: Record<string, string> = {
    presencial: 'presencial',
    hibrido: 'hibrido',
    remoto: 'remoto',
  };
  // region_preference do Pathly aceita: same_region | open_to_change
  const regiaoMap: Record<string, string> = {
    mesma_regiao: 'same_region',
    outras_regioes: 'open_to_change',
    indiferente: 'open_to_change',
  };

  // Pathly exige state como VARCHAR(2). Se vier em formato longo, tenta extrair UF.
  const rawState = (project.estado ?? '').trim();
  const state = rawState.length === 2 ? rawState.toUpperCase() : (rawState.slice(0, 2).toUpperCase() || null);

  return callPathly('create_plan', {
    mentee_name: project.party_name || project.title,
    mentee_email: project.party_email ?? null,
    // current_position/current_area são obrigatórios no Pathly (NOT NULL)
    current_position: project.target_role || 'A definir',
    current_area: project.target_industry || 'A definir',
    target_role: project.target_role ?? null,
    target_location: project.target_location ?? null,
    employment_status: project.situacao_atual ? situacaoMap[project.situacao_atual] ?? project.situacao_atual : null,
    work_model: project.modelo_trabalho ? modeloMap[project.modelo_trabalho] ?? project.modelo_trabalho : null,
    state,
    city: project.cidade ?? null,
    region_preference: project.preferencia_regiao ? regiaoMap[project.preferencia_regiao] ?? project.preferencia_regiao : null,
    cities_of_interest: project.cidades_interesse ?? [],
    orionpipe_client_id: project.id ?? null,
    source: 'orion',
  });
}

export async function ensureProjectPathlyLink(project: {
  id: string;
  title: string;
  pathly_plan_id?: string | null;
  client_email?: string | null;
  target_role?: string | null;
  target_industry?: string | null;
  target_location?: string | null;
  situacao_atual?: string | null;
  modelo_trabalho?: string | null;
  estado?: string | null;
  cidade?: string | null;
  preferencia_regiao?: string | null;
  cidades_interesse?: Array<{ estado: string; cidade: string }> | null;
}) {
  const syncedAt = new Date().toISOString();

  // Mapeamentos de vocabulário Orion -> Pathly (mesmos usados em createPathlyPlan)
  const modeloMap: Record<string, string> = {
    presencial: 'presencial',
    hibrido: 'hibrido',
    remoto: 'remoto',
  };
  const regiaoMap: Record<string, string> = {
    mesma_regiao: 'same_region',
    outras_regioes: 'open_to_change',
    indiferente: 'open_to_change',
  };
  const rawState = (project.estado ?? '').trim();
  const state = rawState.length === 2
    ? rawState.toUpperCase()
    : (rawState.slice(0, 2).toUpperCase() || null);

  if (project.pathly_plan_id) {
    // Plano já existe: atualiza dados cadastrais + ativa vínculo
    const updateResult = await callPathlyWithRetry('update_plan', {
      plan_id: project.pathly_plan_id,
      mentee_name: project.title,
      mentee_email: project.client_email ?? null,
      current_position: project.target_role || 'A definir',
      current_area: project.target_industry || 'A definir',
      target_role: project.target_role ?? null,
      work_model: project.modelo_trabalho ? modeloMap[project.modelo_trabalho] ?? project.modelo_trabalho : null,
      state,
      city: project.cidade ?? null,
      region_preference: project.preferencia_regiao
        ? regiaoMap[project.preferencia_regiao] ?? project.preferencia_regiao
        : null,
      cities_of_interest: project.cidades_interesse ?? [],
      orionpipe_client_id: project.id,
    });

    const activateResult = await callPathlyWithRetry('activate_plan', {
      plan_id: project.pathly_plan_id,
      orionpipe_client_id: project.id,
    });

    const ok = updateResult.ok && activateResult.ok;
    if (ok) {
      await supabase
        .from('outplacement_projects')
        .update({ pathly_synced_at: syncedAt })
        .eq('id', project.id);
    }

    return {
      ok,
      error: !ok ? (updateResult.error || activateResult.error) : null,
      data: updateResult.data ?? activateResult.data,
      planId: project.pathly_plan_id,
      created: false,
    };
  }

  const result = await createPathlyPlan({
    id: project.id,
    title: project.title,
    party_name: project.title,
    party_email: project.client_email ?? null,
    target_role: project.target_role,
    target_industry: project.target_industry,
    target_location: project.target_location,
    situacao_atual: project.situacao_atual,
    modelo_trabalho: project.modelo_trabalho,
    estado: project.estado,
    cidade: project.cidade,
    preferencia_regiao: project.preferencia_regiao,
    cidades_interesse: project.cidades_interesse,
  });

  const planId = (result.data as { plan?: { id?: string } } | null)?.plan?.id ?? null;
  if (result.ok && planId) {
    await supabase
      .from('outplacement_projects')
      .update({ pathly_plan_id: planId, pathly_synced_at: syncedAt })
      .eq('id', project.id);
  }

  return { ...result, planId, created: !!planId };
}

interface MirrorProjectProgress {
  phase: 'link' | 'companies' | 'contacts' | 'jobs';
  processed: number;
  total: number;
}

export async function mirrorProjectToPathly(
  projectId: string,
  options?: {
    delayMs?: number;
    onProgress?: (progress: MirrorProjectProgress) => void;
  },
) {
  const delayMs = options?.delayMs ?? 120;
  const onProgress = options?.onProgress;
  const syncedAt = new Date().toISOString();

  const [projectResult, contactsResult, jobsResult] = await Promise.all([
    supabase.from('outplacement_projects').select('*').eq('id', projectId).maybeSingle(),
    supabase.from('outplacement_contacts').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
    supabase.from('outplacement_market_jobs').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
  ]);

  if (projectResult.error) throw projectResult.error;
  if (contactsResult.error) throw contactsResult.error;
  if (jobsResult.error) throw jobsResult.error;
  if (!projectResult.data) throw new Error('Projeto não encontrado');

  onProgress?.({ phase: 'link', processed: 0, total: 1 });
  const project = projectResult.data;
  const link = await ensureProjectPathlyLink({
    id: project.id,
    title: project.title,
    pathly_plan_id: project.pathly_plan_id,
    client_email: project.client_email,
    target_role: project.target_role,
    target_industry: project.target_industry,
    target_location: project.target_location,
    situacao_atual: project.situacao_atual,
    modelo_trabalho: project.modelo_trabalho,
    estado: project.estado,
    cidade: project.cidade,
    preferencia_regiao: project.preferencia_regiao,
    cidades_interesse: normalizeCityPreferences(project.cidades_interesse),
  });
  if (!link.ok || !link.planId) {
    throw new Error(link.error || 'Não foi possível vincular o projeto ao Pathly');
  }
  onProgress?.({ phase: 'link', processed: 1, total: 1 });

  const planId = link.planId;
  const contacts = contactsResult.data ?? [];
  const jobs = jobsResult.data ?? [];

  const companyMap = new Map<string, { name: string; tier: string }>();
  for (const contact of contacts) {
    const name = contact.company_name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = companyMap.get(key);
    companyMap.set(key, {
      name,
      tier: pickCompanyTier(existing?.tier, contact.tier),
    });
  }

  const companies = Array.from(companyMap.values());
  let companyOk = 0;
  let companyFailed = 0;
  for (const [index, company] of companies.entries()) {
    const result = await callPathlyWithRetry('upsert_company', {
      plan_id: planId,
      name: company.name,
      tier: company.tier,
      has_openings: false,
      source: 'orion',
    });

    if (result.ok) companyOk += 1;
    else companyFailed += 1;

    onProgress?.({ phase: 'companies', processed: index + 1, total: companies.length });
    if (delayMs > 0) await sleep(delayMs);
  }

  let contactOk = 0;
  let contactFailed = 0;
  const syncedContactIds: string[] = [];
  for (const [index, contact] of contacts.entries()) {
    const result = await callPathlyWithRetry('upsert_contact', {
      plan_id: planId,
      name: contact.name,
      current_position: contact.current_position ?? null,
      company: contact.company_name ?? null,
      linkedin_url: contact.linkedin_url ?? null,
      type: mapContactTypeToPathly(contact.contact_type),
      tier: contact.tier ?? 'B',
      status: mapContactStatusToPathly(contact.kanban_stage),
      notes: contact.notes ?? null,
      source: 'orion',
    });

    if (result.ok) {
      contactOk += 1;
      syncedContactIds.push(contact.id);
    } else {
      contactFailed += 1;
    }

    onProgress?.({ phase: 'contacts', processed: index + 1, total: contacts.length });
    if (delayMs > 0) await sleep(delayMs);
  }

  for (let index = 0; index < syncedContactIds.length; index += 100) {
    await supabase
      .from('outplacement_contacts')
      .update({ pathly_synced_at: syncedAt })
      .in('id', syncedContactIds.slice(index, index + 100));
  }

  let jobOk = 0;
  let jobFailed = 0;
  const syncedJobIds: string[] = [];
  for (const [index, job] of jobs.entries()) {
    const result = await callPathlyWithRetry('upsert_market_job', {
      plan_id: planId,
      job_title: job.job_title,
      company_name: job.company_name,
      location: job.location ?? null,
      job_url: job.job_url ?? null,
      source: job.source ?? null,
      status: job.status ?? 'identificada',
      notes: job.notes ?? null,
    });

    if (result.ok) {
      jobOk += 1;
      syncedJobIds.push(job.id);
    } else {
      jobFailed += 1;
    }

    onProgress?.({ phase: 'jobs', processed: index + 1, total: jobs.length });
    if (delayMs > 0) await sleep(delayMs);
  }

  for (let index = 0; index < syncedJobIds.length; index += 100) {
    await supabase
      .from('outplacement_market_jobs')
      .update({ pathly_synced_at: syncedAt })
      .in('id', syncedJobIds.slice(index, index + 100));
  }

  await supabase
    .from('outplacement_projects')
    .update({ pathly_synced_at: syncedAt })
    .eq('id', projectId);

  return {
    planId,
    companies: { ok: companyOk, failed: companyFailed, total: companies.length },
    contacts: { ok: contactOk, failed: contactFailed, total: contacts.length },
    jobs: { ok: jobOk, failed: jobFailed, total: jobs.length },
  };
}

export async function listMenteeContributions(planId: string, since?: string) {
  return callPathly('list_mentee_contributions', {
    plan_id: planId,
    since,
    source: 'extension',
  });
}
