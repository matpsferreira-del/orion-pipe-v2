import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContractMilestone, MilestoneType, MilestoneStatus } from '@/types/contract';
import { toast } from 'sonner';

export function useContractMilestones(jobId: string | undefined) {
  return useQuery({
    queryKey: ['contract-milestones', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from('job_contract_milestones' as any)
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as any[]) as ContractMilestone[];
    },
    enabled: !!jobId,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestone: {
      job_id: string;
      milestone_type: MilestoneType;
      percentage?: number;
      valor: number;
      status?: MilestoneStatus;
      rpo_cycle_month?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('job_contract_milestones' as any)
        .insert(milestone as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['contract-milestones', vars.job_id] });
    },
    onError: (error: any) => {
      toast.error('Erro ao criar milestone: ' + error.message);
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, job_id, ...updates }: { id: string; job_id: string; status?: MilestoneStatus; valor?: number; triggered_at?: string; financial_transaction_id?: string }) => {
      const { error } = await supabase
        .from('job_contract_milestones' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['contract-milestones', vars.job_id] });
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar milestone: ' + error.message);
    },
  });
}

export function useCreateMilestoneWithTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      job_id: string;
      milestone_type: MilestoneType;
      percentage?: number;
      valor: number;
      description: string;
      pacote: string;
      conta_contabil: string;
      data_referencia: string;
      data_vencimento: string;
      rpo_cycle_month?: string;
    }) => {
      // 1. Create financial transaction
      const { data: tx, error: txError } = await supabase
        .from('financial_transactions' as any)
        .insert({
          pacote: params.pacote,
          conta_contabil: params.conta_contabil,
          descricao: params.description,
          valor: params.valor,
          data_referencia: params.data_referencia,
          data_vencimento: params.data_vencimento,
          status: 'pendente',
          job_id: params.job_id,
        } as any)
        .select()
        .single();
      if (txError) throw txError;

      // 2. Create milestone linked to transaction
      const { data: milestone, error: msError } = await supabase
        .from('job_contract_milestones' as any)
        .insert({
          job_id: params.job_id,
          milestone_type: params.milestone_type,
          percentage: params.percentage,
          valor: params.valor,
          status: 'previsto',
          financial_transaction_id: (tx as any).id,
          description: params.description,
          rpo_cycle_month: params.rpo_cycle_month,
        } as any)
        .select()
        .single();
      if (msError) throw msError;

      return { milestone, transaction: tx };
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['contract-milestones', vars.job_id] });
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      toast.success('Lançamento financeiro criado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar lançamento: ' + error.message);
    },
  });
}
