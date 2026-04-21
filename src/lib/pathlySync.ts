import { supabase } from '@/integrations/supabase/client';

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
  // Map Orion -> Pathly vocabulary
  const typeMap: Record<string, string> = {
    decisor: 'decision_maker',
    rh: 'hr',
    recrutador: 'recruiter',
    indicacao: 'referral',
    outro: 'other',
  };
  const stageMap: Record<string, string> = {
    identificado: 'identified',
    convite_enviado: 'invite_sent',
    conectado: 'connected',
    msg_enviada: 'message_sent',
    respondeu: 'replied',
    reuniao_agendada: 'meeting_scheduled',
  };

  // Upsert empresa (se houver)
  if (contact.company_name) {
    await callPathly('upsert_company', {
      plan_id: planId,
      name: contact.company_name,
      tier: contact.tier ?? 'B',
      has_openings: false,
      source: 'orion',
    });
  }

  return callPathly('upsert_contact', {
    plan_id: planId,
    name: contact.name,
    current_position: contact.current_position ?? null,
    company: contact.company_name ?? null,
    linkedin_url: contact.linkedin_url ?? null,
    type: typeMap[contact.contact_type ?? 'outro'] ?? 'other',
    tier: contact.tier ?? 'B',
    status: stageMap[contact.kanban_stage ?? 'identificado'] ?? 'identified',
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
  // Tenta a action upsert_market_job na bridge (pode não existir ainda no Pathly).
  // Se falhar, registramos warning mas não quebramos o fluxo.
  return callPathly('upsert_market_job', {
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
  title: string;
  party_name?: string | null;
  party_email?: string | null;
  target_role?: string | null;
  target_industry?: string | null;
  target_location?: string | null;
}) {
  return callPathly('create_plan', {
    mentee_name: project.party_name || project.title,
    mentee_email: project.party_email ?? null,
    current_position: project.target_role ?? '',
    current_area: project.target_industry ?? '',
    target_role: project.target_role ?? null,
    target_location: project.target_location ?? null,
    source: 'orion',
  });
}

export async function listMenteeContributions(planId: string, since?: string) {
  return callPathly('list_mentee_contributions', {
    plan_id: planId,
    since,
    source: 'extension',
  });
}
