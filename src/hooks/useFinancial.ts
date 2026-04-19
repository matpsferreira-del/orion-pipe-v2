import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChartAccount {
  id: string;
  pacote: string;
  conta_contabil: string;
  tipo: string;
  ordem: number;
  ativo: boolean;
  codigo: string | null;
  sub_pacote: string | null;
}

export interface FinancialTransaction {
  id: string;
  pacote: string;
  conta_contabil: string;
  descricao: string | null;
  valor: number;
  data_referencia: string;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  recorrente: boolean;
  recorrencia_meses: number | null;
  invoice_id: string | null;
  job_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Novos campos
  debito_automatico: boolean;
  responsavel_id: string | null;
  reembolso: boolean;
  reembolso_status: 'pendente' | 'reembolsado' | null;
  forma_pagamento: string | null;
}

export interface FinancialTransactionInsert {
  pacote: string;
  conta_contabil: string;
  descricao?: string;
  valor: number;
  data_referencia: string;
  data_vencimento: string;
  data_pagamento?: string | null;
  status?: string;
  recorrente?: boolean;
  recorrencia_meses?: number;
  invoice_id?: string;
  job_id?: string;
  debito_automatico?: boolean;
  responsavel_id?: string | null;
  reembolso?: boolean;
  reembolso_status?: 'pendente' | 'reembolsado' | null;
  forma_pagamento?: string | null;
}

export function useChartOfAccounts(includeInactive = false) {
  return useQuery({
    queryKey: ['chart_of_accounts', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('chart_of_accounts' as any)
        .select('*')
        .order('ordem');
      if (!includeInactive) query = query.eq('ativo', true);
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) as ChartAccount[];
    },
  });
}

export function useFinancialTransactions(year?: number) {
  return useQuery({
    queryKey: ['financial_transactions', year],
    queryFn: async () => {
      let query = supabase
        .from('financial_transactions' as any)
        .select('*')
        .is('deleted_at', null)
        .order('data_referencia', { ascending: false });

      if (year) {
        query = query
          .gte('data_referencia', `${year}-01-01`)
          .lte('data_referencia', `${year}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) as FinancialTransaction[];
    },
  });
}

/**
 * Hook dedicado para buscar reembolsos pendentes.
 */
export function usePendingReimbursements() {
  return useQuery({
    queryKey: ['financial_transactions', 'reembolsos_pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_transactions' as any)
        .select('*')
        .is('deleted_at', null)
        .eq('reembolso', true)
        .eq('reembolso_status', 'pendente')
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return (data as any[]) as FinancialTransaction[];
    },
  });
}

// ============= Mutations (consolidadas) =============

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['financial_transactions'] });
};

export function useCreateFinancialTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: FinancialTransactionInsert) => {
      const { data, error } = await supabase
        .from('financial_transactions' as any)
        .insert(transaction as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidateAll(qc); toast.success('Lançamento criado!'); },
    onError: (error: any) => toast.error('Erro ao criar lançamento: ' + error.message),
  });
}

export function useCreateBulkFinancialTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transactions: FinancialTransactionInsert[]) => {
      const { data, error } = await supabase
        .from('financial_transactions' as any)
        .insert(transactions as any[])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => { invalidateAll(qc); toast.success(`${vars.length} lançamentos criados!`); },
    onError: (error: any) => toast.error('Erro ao criar lançamentos: ' + error.message),
  });
}

export function useUpdateFinancialTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<FinancialTransactionInsert>) => {
      const { error } = await supabase
        .from('financial_transactions' as any)
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(qc); toast.success('Lançamento atualizado!'); },
    onError: (error: any) => toast.error('Erro ao atualizar: ' + error.message),
  });
}

export function useSoftDeleteFinancialTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_transactions' as any)
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(qc); toast.success('Lançamento excluído!'); },
    onError: (error: any) => toast.error('Erro ao excluir: ' + error.message),
  });
}

/**
 * Marca um reembolso como pago/reembolsado.
 */
export function useMarkReimbursementPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_transactions' as any)
        .update({
          reembolso_status: 'reembolsado',
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0],
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(qc); toast.success('Reembolso marcado como pago!'); },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });
}
