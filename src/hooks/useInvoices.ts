import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InvoiceRow {
  id: string;
  company_id: string;
  opportunity_id: string | null;
  numero_nota: string;
  cnpj_cliente: string;
  descricao_servico: string;
  valor: number;
  data_emissao: string;
  data_vencimento: string;
  status: string;
  forma_pagamento: string;
  created_at: string;
}

export interface InvoiceInsert {
  company_id: string;
  opportunity_id?: string;
  numero_nota: string;
  cnpj_cliente: string;
  descricao_servico: string;
  valor: number;
  data_emissao: string;
  data_vencimento: string;
  status?: string;
  forma_pagamento: string;
}

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('data_emissao', { ascending: false });
      
      if (error) throw error;
      return data as InvoiceRow[];
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoice: InvoiceInsert) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoice)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Fatura criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar fatura: ' + error.message);
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Fatura excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir fatura: ' + error.message);
    },
  });
}
