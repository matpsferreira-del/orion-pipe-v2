import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartyHistoryEvent {
  id: string;
  type: 'email' | 'stage_change' | 'status_change' | 'application_created';
  date: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

function normalizeRecipients(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((recipient): recipient is string => typeof recipient === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((recipient): recipient is string => typeof recipient === 'string');
      }
    } catch {
      return value.includes('@') ? [value] : [];
    }
  }

  return [];
}

export function usePartyHistory(partyId: string | undefined, email?: string | null) {
  return useQuery({
    queryKey: ['party-history', partyId, email],
    enabled: !!partyId,
    queryFn: async () => {
      const events: PartyHistoryEvent[] = [];

      const [applicationsResult, emailLogsResult] = await Promise.all([
        supabase
          .from('applications')
          .select('id, job_id, status, source, applied_at, stage_id')
          .eq('party_id', partyId!)
          .order('applied_at', { ascending: false }),
        email
          ? supabase
              .from('email_log')
              .select('id, subject, recipients, created_at, status, sender_email')
              .order('created_at', { ascending: false })
              .limit(250)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (applicationsResult.error) throw applicationsResult.error;
      if (emailLogsResult.error) throw emailLogsResult.error;

      const applications = applicationsResult.data || [];
      const emails = emailLogsResult.data || [];

      if (applications && applications.length > 0) {
        const jobIds = [...new Set(applications.map(a => a.job_id))];
        const appIds = applications.map(a => a.id);

        const [jobsResult, historyBatches] = await Promise.all([
          supabase
            .from('jobs')
            .select('id, title')
            .in('id', jobIds),
          Promise.all(
            Array.from({ length: Math.ceil(appIds.length / 500) }, (_, index) => {
              const batch = appIds.slice(index * 500, index * 500 + 500);

              return supabase
                .from('application_history')
                .select('*')
                .in('application_id', batch)
                .order('created_at', { ascending: false });
            }),
          ),
        ]);

        if (jobsResult.error) throw jobsResult.error;

        const jobs = jobsResult.data || [];
        const jobMap = new Map((jobs || []).map(j => [j.id, j.title]));

        for (const app of applications) {
          events.push({
            id: `app-${app.id}`,
            type: 'application_created',
            date: app.applied_at,
            title: 'Candidatura registrada',
            description: `Vaga: ${jobMap.get(app.job_id) || 'Desconhecida'} | Origem: ${app.source}`,
          });
        }

        const allHistory = historyBatches.flatMap((result) => result.data || []);
        const stageIds = [...new Set([
          ...allHistory.map(h => h.from_stage_id).filter(Boolean),
          ...allHistory.map(h => h.to_stage_id).filter(Boolean),
        ])] as string[];

        let stageMap = new Map<string, string>();
        if (stageIds.length > 0) {
          const { data: stages, error: stagesError } = await supabase
            .from('job_pipeline_stages')
            .select('id, name')
            .in('id', stageIds);

          if (stagesError) throw stagesError;
          stageMap = new Map((stages || []).map(s => [s.id, s.name]));
        }

        const appJobMap = new Map(applications.map(a => [a.id, a.job_id]));

        for (const h of allHistory) {
          const jobTitle = jobMap.get(appJobMap.get(h.application_id) || '') || '';
          const fromStage = h.from_stage_id ? stageMap.get(h.from_stage_id) : null;
          const toStage = h.to_stage_id ? stageMap.get(h.to_stage_id) : null;

          if (fromStage || toStage) {
            events.push({
              id: `hist-${h.id}`,
              type: 'stage_change',
              date: h.created_at,
              title: `Mudança de etapa${jobTitle ? ` — ${jobTitle}` : ''}`,
              description: fromStage && toStage
                ? `${fromStage} → ${toStage}`
                : toStage ? `→ ${toStage}` : `${fromStage} →`,
              metadata: { note: h.note },
            });
          }

          if (h.from_status !== h.to_status && h.to_status) {
            events.push({
              id: `status-${h.id}`,
              type: 'status_change',
              date: h.created_at,
              title: `Status alterado${jobTitle ? ` — ${jobTitle}` : ''}`,
              description: `${h.from_status || '—'} → ${h.to_status}`,
              metadata: { note: h.note },
            });
          }
        }
      }

      if (email) {
        if (emails) {
          for (const e of emails) {
            const recipientsList = normalizeRecipients(e.recipients);
            const isRecipient = recipientsList.some((recipient) => recipient.toLowerCase() === email.toLowerCase());

            if (isRecipient) {
              events.push({
                id: `email-${e.id}`,
                type: 'email',
                date: e.created_at,
                title: `Email enviado`,
                description: `Assunto: ${e.subject} | De: ${e.sender_email}`,
                metadata: { status: e.status },
              });
            }
          }
        }
      }

      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return events;
    },
  });
}
