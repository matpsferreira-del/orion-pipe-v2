import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaskRow {
  id: string;
  titulo: string;
  descricao: string | null;
  priority: string;
  status: string;
  created_at: string;
  due_date: string;
  responsavel_id: string;
  user_id: string;
  company_id: string | null;
  opportunity_id: string | null;
}

export type TaskInsert = Omit<TaskRow, 'id' | 'created_at'>;
export type TaskUpdate = Partial<TaskInsert>;

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as TaskRow[];
    },
  });
}

export function useTasksByResponsavel(responsavelId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'responsavel', responsavelId],
    queryFn: async () => {
      if (!responsavelId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('responsavel_id', responsavelId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as TaskRow[];
    },
    enabled: !!responsavelId,
  });
}

export function useTasksByCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'company', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('company_id', companyId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as TaskRow[];
    },
    enabled: !!companyId,
  });
}

export function usePendingTasks() {
  return useQuery({
    queryKey: ['tasks', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('status', ['pendente', 'em_andamento'])
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as TaskRow[];
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Erro ao criar tarefa');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string } & TaskUpdate) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa atualizada!');
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Erro ao atualizar tarefa');
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa excluída');
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Erro ao excluir tarefa');
    },
  });
}
