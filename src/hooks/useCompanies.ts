import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanyRow {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  site: string | null;
  segmento: string;
  porte: string;
  cidade: string;
  estado: string;
  status: string;
  responsavel_id: string | null;
  parent_company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyInsert {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  site?: string;
  segmento: string;
  porte: string;
  cidade: string;
  estado: string;
  status?: string;
  responsavel_id?: string;
  parent_company_id?: string | null;
}

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('nome_fantasia', { ascending: true });
      
      if (error) throw error;
      return data as CompanyRow[];
    },
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (company: CompanyInsert) => {
      const { data, error } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single();
      
      if (error) throw error;
      
      // Automatically grant creator access to the new company
      if (user?.id && data?.id) {
        const { error: accessError } = await supabase
          .from('user_company_access')
          .insert({
            user_id: user.id,
            company_id: data.id,
            access_level: 'owner',
          });
        
        if (accessError) {
          console.error('Error granting company access:', accessError);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-access'] });
      toast.success('Empresa criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar empresa: ' + error.message);
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CompanyRow> & { id: string }) => {
      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar empresa: ' + error.message);
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir empresa: ' + error.message);
    },
  });
}
