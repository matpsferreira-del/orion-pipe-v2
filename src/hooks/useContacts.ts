import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchAllRows } from '@/lib/fetchAllRows';

export interface ContactRow {
  id: string;
  company_id: string;
  nome: string;
  cargo: string;
  email: string;
  telefone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  observacoes: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface ContactInsert {
  company_id: string;
  nome: string;
  cargo: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  linkedin?: string;
  observacoes?: string;
  is_primary?: boolean;
}

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      return fetchAllRows<ContactRow>('contacts', {
        orderBy: 'nome',
        ascending: true,
      });
    },
  });
}

export function useContactsByCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ['contacts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('nome', { ascending: true });
      
      if (error) throw error;
      return data as ContactRow[];
    },
    enabled: !!companyId,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contact: ContactInsert) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert(contact)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contato criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar contato: ' + error.message);
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContactRow> & { id: string }) => {
      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contato atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar contato: ' + error.message);
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contato excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir contato: ' + error.message);
    },
  });
}
