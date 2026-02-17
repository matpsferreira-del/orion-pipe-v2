import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchAllRows } from '@/lib/fetchAllRows';

export interface ActivityRow {
  id: string;
  opportunity_id: string | null;
  company_id: string;
  user_id: string;
  type: string;
  titulo: string;
  descricao: string | null;
  data: string;
  created_at: string;
}

export type ActivityInsert = Omit<ActivityRow, 'id' | 'created_at'>;

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      return fetchAllRows<ActivityRow>('activities', {
        orderBy: 'data',
        ascending: false,
      });
    },
  });
}

export function useActivitiesByCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ['activities', 'company', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('company_id', companyId)
        .order('data', { ascending: false });
      
      if (error) throw error;
      return data as ActivityRow[];
    },
    enabled: !!companyId,
  });
}

export function useActivitiesByOpportunity(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['activities', 'opportunity', opportunityId],
    queryFn: async () => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('data', { ascending: false });
      
      if (error) throw error;
      return data as ActivityRow[];
    },
    enabled: !!opportunityId,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (activity: ActivityInsert) => {
      const { data, error } = await supabase
        .from('activities')
        .insert(activity)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Atividade registrada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating activity:', error);
      toast.error('Erro ao registrar atividade');
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Atividade excluída');
    },
    onError: (error) => {
      console.error('Error deleting activity:', error);
      toast.error('Erro ao excluir atividade');
    },
  });
}
