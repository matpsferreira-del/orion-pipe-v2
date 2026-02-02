import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanyAccessRow {
  id: string;
  user_id: string;
  company_id: string;
  access_level: 'owner' | 'admin' | 'member' | 'readonly';
  created_at: string;
}

export interface CompanyAccessInsert {
  user_id: string;
  company_id: string;
  access_level?: 'owner' | 'admin' | 'member' | 'readonly';
}

// Get companies the current user has access to
export function useUserCompanyAccess() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['company-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_company_access')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as CompanyAccessRow[];
    },
    enabled: !!user?.id,
  });
}

// Get all users with access to a specific company
export function useCompanyUsers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company-users', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('user_company_access')
        .select('*, profiles:user_id(id, name, email, avatar)')
        .eq('company_id', companyId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

// Grant a user access to a company
export function useGrantCompanyAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (access: CompanyAccessInsert) => {
      const { data, error } = await supabase
        .from('user_company_access')
        .insert({
          user_id: access.user_id,
          company_id: access.company_id,
          access_level: access.access_level || 'member',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company-access'] });
      queryClient.invalidateQueries({ queryKey: ['company-users', variables.company_id] });
      toast.success('Acesso concedido com sucesso!');
    },
    onError: (error) => {
      console.error('Error granting company access:', error);
      toast.error('Erro ao conceder acesso');
    },
  });
}

// Revoke a user's access to a company
export function useRevokeCompanyAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
      const { error } = await supabase
        .from('user_company_access')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', companyId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company-access'] });
      queryClient.invalidateQueries({ queryKey: ['company-users', variables.companyId] });
      toast.success('Acesso revogado');
    },
    onError: (error) => {
      console.error('Error revoking company access:', error);
      toast.error('Erro ao revogar acesso');
    },
  });
}

// Update a user's access level for a company
export function useUpdateCompanyAccessLevel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      companyId, 
      accessLevel 
    }: { 
      userId: string; 
      companyId: string; 
      accessLevel: 'owner' | 'admin' | 'member' | 'readonly';
    }) => {
      const { error } = await supabase
        .from('user_company_access')
        .update({ access_level: accessLevel })
        .eq('user_id', userId)
        .eq('company_id', companyId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company-access'] });
      queryClient.invalidateQueries({ queryKey: ['company-users', variables.companyId] });
      toast.success('Nível de acesso atualizado');
    },
    onError: (error) => {
      console.error('Error updating access level:', error);
      toast.error('Erro ao atualizar nível de acesso');
    },
  });
}
