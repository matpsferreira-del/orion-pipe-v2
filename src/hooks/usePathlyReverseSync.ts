import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OutplacementProject } from './useOutplacementProjects';

const POLL_INTERVAL_MS = 30_000;

// Polls pathly-pull every 30s to sync contacts added in Pathly → OrionPipe.
// Realtime cross-project subscriptions are not possible (different Supabase projects),
// so polling the edge function is the correct approach.
export function usePathlyReverseSync(projects: OutplacementProject[]) {
  const qc = useQueryClient();

  useEffect(() => {
    const hasLinkedProjects = projects.some(p => p.pathly_plan_id);
    if (!hasLinkedProjects) return;

    async function pull() {
      try {
        await supabase.functions.invoke('pathly-pull');
        qc.invalidateQueries({ queryKey: ['outplacement-contacts'] });
        qc.invalidateQueries({ queryKey: ['outplacement-market-jobs'] });
      } catch (e) {
        console.warn('[PathlyReverseSync] pull failed:', e);
      }
    }

    pull();
    const id = setInterval(pull, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [projects.some(p => p.pathly_plan_id)]);
}
