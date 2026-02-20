import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchAllRows } from '@/lib/fetchAllRows';

export interface OpportunityRow {
  id: string;
  company_id: string;
  contact_id: string;
  responsavel_id: string;
  stage: string;
  valor_potencial: number;
  probabilidade: number;
  data_previsao_fechamento: string;
  origem_lead: string;
  tipo_servico: string;
  observacoes: string | null;
  spin_situacao_como_contrata: string | null;
  spin_situacao_time_interno: string | null;
  spin_problema_dificuldades: string | null;
  spin_problema_tempo_medio: string | null;
  spin_implicacao_impacto: string | null;
  spin_implicacao_perda: string | null;
  spin_necessidade_cenario: string | null;
  spin_necessidade_urgencia: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityInsert {
  company_id: string;
  contact_id: string;
  responsavel_id: string;
  stage?: string;
  valor_potencial: number;
  probabilidade: number;
  data_previsao_fechamento: string;
  origem_lead: string;
  tipo_servico: string;
  observacoes?: string;
}

export function useOpportunities() {
  return useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      return fetchAllRows<OpportunityRow>('opportunities', {
        orderBy: 'created_at',
        ascending: false,
      });
    },
  });
}

export function useUpdateOpportunityStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from('opportunities')
        .update({ stage })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar oportunidade: ' + error.message);
    },
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (opportunity: OpportunityInsert) => {
      const { data, error } = await supabase
        .from('opportunities')
        .insert(opportunity)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Oportunidade criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar oportunidade: ' + error.message);
    },
  });
}

export interface OpportunityUpdate {
  company_id?: string;
  contact_id?: string;
  responsavel_id?: string;
  stage?: string;
  valor_potencial?: number;
  probabilidade?: number;
  data_previsao_fechamento?: string;
  origem_lead?: string;
  tipo_servico?: string;
  observacoes?: string | null;
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: OpportunityUpdate }) => {
      const { error } = await supabase
        .from('opportunities')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Oportunidade atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar oportunidade: ' + error.message);
    },
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Oportunidade excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir oportunidade: ' + error.message);
    },
  });
}
