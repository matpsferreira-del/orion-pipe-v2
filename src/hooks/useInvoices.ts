import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchAllRows } from '@/lib/fetchAllRows';

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
      return fetchAllRows<InvoiceRow>('invoices', {
        orderBy: 'data_emissao',
        ascending: false,
      });
    },
  });
}

async function syncFinancialTransaction(invoiceId: string, invoice: InvoiceInsert, companyName?: string) {
  try {
    const descricao = companyName
      ? `${companyName} - NF ${invoice.numero_nota}`
      : `NF ${invoice.numero_nota}`;

    // Check if transaction already exists for this invoice
    const { data: existing } = await supabase
      .from('financial_transactions' as any)
      .select('id')
      .eq('invoice_id', invoiceId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      // Update existing
      await supabase
        .from('financial_transactions' as any)
        .update({
          valor: Math.abs(Number(invoice.valor)),
          data_referencia: invoice.data_emissao,
          data_vencimento: invoice.data_vencimento,
          descricao,
          status: invoice.status === 'recebido' ? 'pago' : 'pendente',
        } as any)
        .eq('id', (existing as any).id);
    } else {
      // Create new
      await supabase
        .from('financial_transactions' as any)
        .insert({
          pacote: 'Receita',
          conta_contabil: 'Projeto',
          descricao,
          valor: Math.abs(Number(invoice.valor)),
          data_referencia: invoice.data_emissao,
          data_vencimento: invoice.data_vencimento,
          status: invoice.status === 'recebido' ? 'pago' : 'pendente',
          invoice_id: invoiceId,
        } as any);
    }
  } catch (e) {
    console.error('Failed to sync financial transaction:', e);
  }
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoice: InvoiceInsert & { _companyName?: string }) => {
      const { _companyName, ...invoiceData } = invoice;
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();
      
      if (error) throw error;

      // Sync to financial_transactions
      await syncFinancialTransaction(data.id, invoiceData, _companyName);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
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

      // Sync financial transaction status
      try {
        const ftStatus = status === 'recebido' ? 'pago' : status === 'cancelado' ? 'cancelado' : 'pendente';
        await supabase
          .from('financial_transactions' as any)
          .update({ status: ftStatus } as any)
          .eq('invoice_id', id);
      } catch (e) {
        console.error('Failed to sync financial transaction status:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<InvoiceInsert>) => {
      const { error } = await supabase
        .from('invoices')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Fatura atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar fatura: ' + error.message);
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
