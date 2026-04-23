import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StrategyActivityType = 'email' | 'ligacao' | 'reuniao' | 'linkedin' | 'whatsapp' | 'followup' | 'outro';
export type StrategyLeadStatus = 'frio' | 'morno' | 'quente' | 'convertido' | 'perdido';

export interface StrategyActivity {
  id: string;
  group_id: string;
  member_id: string;
  party_id: string;
  activity_type: StrategyActivityType;
  lead_status: StrategyLeadStatus;
  title: string;
  description: string | null;
  activity_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const ACTIVITY_TYPE_LABELS: Record<StrategyActivityType, string> = {
  email: 'E-mail',
  ligacao: 'Ligação',
  reuniao: 'Reunião',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  followup: 'Follow-up',
  outro: 'Outro',
};

export const LEAD_STATUS_LABELS: Record<StrategyLeadStatus, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
  convertido: 'Convertido',
  perdido: 'Perdido',
};

export const LEAD_STATUS_COLORS: Record<StrategyLeadStatus, string> = {
  frio: 'bg-slate-100 text-slate-700 border-slate-200',
  morno: 'bg-amber-100 text-amber-800 border-amber-200',
  quente: 'bg-orange-100 text-orange-800 border-orange-200',
  convertido: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  perdido: 'bg-rose-100 text-rose-800 border-rose-200',
};

/** Atividades de todos os membros de uma estratégia. */
export function useStrategyActivitiesByGroup(groupId: string | null) {
  return useQuery({
    queryKey: ['strategy-activities', 'group', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_strategy_activities' as any)
        .select('*')
        .eq('group_id', groupId!)
        .order('activity_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as StrategyActivity[];
    },
  });
}

export function useCreateStrategyActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      group_id: string;
      member_id: string;
      party_id: string;
      activity_type: StrategyActivityType;
      lead_status: StrategyLeadStatus;
      title: string;
      description?: string | null;
      activity_date?: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const profileId = userRes.user
        ? (await supabase.from('profiles').select('id').eq('user_id', userRes.user.id).maybeSingle()).data?.id
        : null;

      const { data, error } = await supabase
        .from('commercial_strategy_activities' as any)
        .insert({
          group_id: input.group_id,
          member_id: input.member_id,
          party_id: input.party_id,
          activity_type: input.activity_type,
          lead_status: input.lead_status,
          title: input.title,
          description: input.description ?? null,
          activity_date: input.activity_date || new Date().toISOString(),
          created_by: profileId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['strategy-activities', 'group', vars.group_id] });
    },
  });
}

export function useDeleteStrategyActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, group_id }: { id: string; group_id: string }) => {
      const { error } = await supabase.from('commercial_strategy_activities' as any).delete().eq('id', id);
      if (error) throw error;
      return { group_id };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['strategy-activities', 'group', res.group_id] });
      toast.success('Atividade removida');
    },
    onError: () => toast.error('Erro ao remover atividade'),
  });
}
