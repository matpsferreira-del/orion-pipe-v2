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
}

export interface FinancialTransaction {
  id: string;
  pacote: string;
  conta_contabil: string;
  descricao: string | null;
  valor: number;
  data_referencia: string;
  data_vencimento: string;
  status: string;
  recorrente: boolean;
  recorrencia_meses: number | null;
  invoice_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransactionInsert {
  pacote: string;
  conta_contabil: string;
  descricao?: string;
  valor: number;
  data_referencia: string;
  data_vencimento: string;
  status?: string;
  recorrente?: boolean;
  recorrencia_meses?: number;
  invoice_id?: string;
}

export function useChartOfAccounts() {
  return useQuery({
    queryKey: ['chart_of_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts' as any)
        .select('*')
        .eq('ativo', true)
        .order('ordem');
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

export function useCreateFinancialTransaction() {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      toast.success('Lançamento criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar lançamento: ' + error.message);
    },
  });
}

export function useCreateBulkFinancialTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactions: FinancialTransactionInsert[]) => {
      const { data, error } = await supabase
        .from('financial_transactions' as any)
        .insert(transactions as any[])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      toast.success(`${vars.length} lançamentos criados com sucesso!`);
    },
    onError: (error: any) => {
      toast.error('Erro ao criar lançamentos: ' + error.message);
    },
  });
}

export function useUpdateFinancialTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<FinancialTransactionInsert>) => {
      const { error } = await supabase
        .from('financial_transactions' as any)
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      toast.success('Lançamento atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useSoftDeleteFinancialTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_transactions' as any)
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      toast.success('Lançamento excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });
}
