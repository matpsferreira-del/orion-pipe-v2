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

export function usePartyHistory(partyId: string | undefined, email?: string | null) {
  return useQuery({
    queryKey: ['party-history', partyId],
    enabled: !!partyId,
    queryFn: async () => {
      const events: PartyHistoryEvent[] = [];

      // 1. Fetch applications for this party
      const { data: applications } = await supabase
        .from('applications')
        .select('id, job_id, status, source, applied_at, stage_id')
        .eq('party_id', partyId!)
        .order('applied_at', { ascending: false });

      if (applications && applications.length > 0) {
        // Fetch job names
        const jobIds = [...new Set(applications.map(a => a.job_id))];
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id, title')
          .in('id', jobIds);
        const jobMap = new Map((jobs || []).map(j => [j.id, j.title]));

        // Add application creation events
        for (const app of applications) {
          events.push({
            id: `app-${app.id}`,
            type: 'application_created',
            date: app.applied_at,
            title: 'Candidatura registrada',
            description: `Vaga: ${jobMap.get(app.job_id) || 'Desconhecida'} | Origem: ${app.source}`,
          });
        }

        // Fetch application history (stage/status changes)
        const appIds = applications.map(a => a.id);
        const batchSize = 500;
        const allHistory: any[] = [];
        for (let i = 0; i < appIds.length; i += batchSize) {
          const batch = appIds.slice(i, i + batchSize);
          const { data: history } = await supabase
            .from('application_history')
            .select('*')
            .in('application_id', batch)
            .order('created_at', { ascending: false });
          if (history) allHistory.push(...history);
        }

        // Fetch stage names
        const stageIds = [...new Set([
          ...allHistory.map(h => h.from_stage_id).filter(Boolean),
          ...allHistory.map(h => h.to_stage_id).filter(Boolean),
        ])] as string[];

        let stageMap = new Map<string, string>();
        if (stageIds.length > 0) {
          const { data: stages } = await supabase
            .from('job_pipeline_stages')
            .select('id, name')
            .in('id', stageIds);
          stageMap = new Map((stages || []).map(s => [s.id, s.name]));
        }

        // Map application to job
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

      // 2. Fetch email log for this party's email
      if (email) {
        const { data: emails } = await supabase
          .from('email_log')
          .select('id, subject, recipients, created_at, status, sender_email')
          .order('created_at', { ascending: false })
          .limit(100);

        if (emails) {
          for (const e of emails) {
            const recipientsList = Array.isArray(e.recipients) ? e.recipients : [];
            const isRecipient = recipientsList.some((r: any) =>
              typeof r === 'string'
                ? r.toLowerCase() === email.toLowerCase()
                : false
            );
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

      // Sort by date descending
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return events;
    },
  });
}
