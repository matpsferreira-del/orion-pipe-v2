import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OpportunityMentionRow {
  id: string;
  opportunity_id: string;
  mentioned_user_id: string;
  mentioned_by_user_id: string;
  observacao: string | null;
  status: 'pendente' | 'sinalizada';
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// All mentions across the system (used by Dashboard and Pipeline)
export function useAllOpportunityMentions() {
  return useQuery({
    queryKey: ['opportunity-mentions', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunity_mentions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as OpportunityMentionRow[];
    },
  });
}

export function useOpportunityMentions(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['opportunity-mentions', opportunityId],
    queryFn: async () => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from('opportunity_mentions')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as OpportunityMentionRow[];
    },
    enabled: !!opportunityId,
  });
}

export interface CreateMentionInput {
  opportunity_id: string;
  mentioned_user_id: string;
  observacao?: string;
}

export function useCreateMention() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateMentionInput) => {
      if (!profile?.id) throw new Error('Sem perfil ativo');
      const { data, error } = await supabase
        .from('opportunity_mentions')
        .insert({
          opportunity_id: input.opportunity_id,
          mentioned_user_id: input.mentioned_user_id,
          mentioned_by_user_id: profile.id,
          observacao: input.observacao || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Buscar company_id e nome do mencionado para registrar atividade
      const [{ data: opp }, { data: mentionedProfile }] = await Promise.all([
        supabase.from('opportunities').select('company_id').eq('id', input.opportunity_id).maybeSingle(),
        supabase.from('public_profiles').select('name').eq('id', input.mentioned_user_id).maybeSingle(),
      ]);

      if (opp?.company_id) {
        await supabase.from('activities').insert({
          opportunity_id: input.opportunity_id,
          company_id: opp.company_id,
          user_id: profile.id,
          type: 'mencao',
          titulo: `@ Menção a ${mentionedProfile?.name || 'integrante'}`,
          descricao: input.observacao || null,
          data: new Date().toISOString(),
        });
      }

      // Fire-and-forget notification (do not block UI on email errors)
      supabase.functions.invoke('notify-mention', {
        body: { mention_id: data.id },
      }).catch((err) => console.warn('notify-mention failed', err));

      return data as OpportunityMentionRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunity-mentions'] });
      qc.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Integrante notificado!');
    },
    onError: (err: any) => toast.error('Erro ao marcar: ' + err.message),
  });
}

export function useResolveMention() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ id, resolution_note }: { id: string; resolution_note?: string }) => {
      const { data: mention, error: fetchErr } = await supabase
        .from('opportunity_mentions')
        .select('opportunity_id, mentioned_user_id')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from('opportunity_mentions')
        .update({
          status: 'sinalizada',
          resolution_note: resolution_note || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;

      // Registrar atividade de resolução
      if (mention?.opportunity_id && profile?.id) {
        const { data: opp } = await supabase
          .from('opportunities')
          .select('company_id')
          .eq('id', mention.opportunity_id)
          .maybeSingle();
        if (opp?.company_id) {
          await supabase.from('activities').insert({
            opportunity_id: mention.opportunity_id,
            company_id: opp.company_id,
            user_id: profile.id,
            type: 'mencao',
            titulo: '✓ Menção sinalizada como feita',
            descricao: resolution_note || null,
            data: new Date().toISOString(),
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunity-mentions'] });
      qc.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Menção sinalizada como resolvida');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });
}

export function useDeleteMention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('opportunity_mentions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunity-mentions'] });
      toast.success('Menção removida');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });
}
