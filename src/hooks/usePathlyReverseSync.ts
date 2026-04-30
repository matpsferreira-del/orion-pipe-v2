import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OutplacementProject } from './useOutplacementProjects';

// Reverse maps: Pathly vocabulary → OrionPipe vocabulary
const TYPE_FROM_PATHLY: Record<string, string> = {
  decision_maker: 'decisor',
  hr: 'rh',
  other: 'outro',
};

const STAGE_FROM_PATHLY: Record<string, string> = {
  identified: 'identificado',
  connection_sent: 'convite_enviado',
  connected: 'conectado',
  message_sent: 'msg_enviada',
  replied: 'respondeu',
  meeting_scheduled: 'reuniao_agendada',
};

/**
 * Subscribes to contact_mappings changes where source='pathly'.
 * When a contact is added/updated in Pathly by the mentee or mentor,
 * it is upserted into outplacement_contacts so OrionPipe stays in sync.
 *
 * @param projects - list of outplacement projects (must have pathly_plan_id set)
 */
export function usePathlyReverseSync(projects: OutplacementProject[]) {
  const qc = useQueryClient();
  // stable ref so the effect doesn't re-run on every render
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  useEffect(() => {
    // Build plan_id → project_id lookup from the current project list
    function getPlanMap() {
      const map = new Map<string, string>();
      for (const p of projectsRef.current) {
        if (p.pathly_plan_id) map.set(p.pathly_plan_id, p.id);
      }
      return map;
    }

    const channel = supabase
      .channel('pathly_reverse_sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_mappings',
          filter: "source=eq.pathly",
        },
        async (payload) => {
          const c = payload.new as Record<string, any>;
          const projectId = getPlanMap().get(c.plan_id);
          if (!projectId) return;

          await supabase.from('outplacement_contacts').upsert(
            {
              project_id: projectId,
              name: c.name,
              current_position: c.current_position ?? null,
              company_name: c.company ?? null,
              linkedin_url: c.linkedin_url ?? null,
              contact_type: TYPE_FROM_PATHLY[c.type] ?? 'outro',
              tier: c.tier ?? 'B',
              kanban_stage: STAGE_FROM_PATHLY[c.status] ?? 'identificado',
              notes: c.notes ?? null,
            },
            {
              onConflict: 'project_id,linkedin_url',
              ignoreDuplicates: false,
            }
          );

          qc.invalidateQueries({ queryKey: ['outplacement-contacts'] });
          qc.invalidateQueries({ queryKey: ['outplacement-contacts', projectId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contact_mappings',
          filter: "source=eq.pathly",
        },
        async (payload) => {
          const c = payload.new as Record<string, any>;
          const projectId = getPlanMap().get(c.plan_id);
          if (!projectId) return;

          // Update kanban_stage and status fields if contact exists by linkedin_url or name
          const matchCol = c.linkedin_url ? 'linkedin_url' : null;
          if (!matchCol) return;

          await supabase
            .from('outplacement_contacts')
            .update({
              kanban_stage: STAGE_FROM_PATHLY[c.status] ?? 'identificado',
              current_position: c.current_position ?? null,
              company_name: c.company ?? null,
            })
            .eq('project_id', projectId)
            .eq(matchCol, c[matchCol]);

          qc.invalidateQueries({ queryKey: ['outplacement-contacts'] });
          qc.invalidateQueries({ queryKey: ['outplacement-contacts', projectId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // empty deps — uses ref for projects
}
