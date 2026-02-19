import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Job, JobPipelineStage, JobStatus } from '@/types/ats';
import { useAuth } from '@/contexts/AuthContext';

export type JobRow = Job;
export type JobInsert = {
  company_id: string;
  contact_id?: string | null;
  responsavel_id?: string | null;
  title: string;
  description?: string | null;
  requirements?: string | null;
  location?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  status?: JobStatus;
  priority?: string;
  deadline?: string | null;
};
export type JobUpdate = Partial<JobInsert>;

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JobRow[];
    },
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as JobRow;
    },
    enabled: !!id,
  });
}

export function useJobStages(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job-stages', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from('job_pipeline_stages')
        .select('*')
        .eq('job_id', jobId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as JobPipelineStage[];
    },
    enabled: !!jobId,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (job: Omit<JobInsert, 'created_by'>) => {
      if (!profile?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          ...job,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as JobRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: JobUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as JobRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', data.id] });
    },
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'filled') {
        updateData.filled_at = new Date().toISOString();
      } else {
        updateData.filled_at = null;
      }

      const { data, error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as JobRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', data.id] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function usePublishJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title, unpublish }: { id: string; title: string; unpublish?: boolean }) => {
      if (unpublish) {
        const { data, error } = await supabase
          .from('jobs')
          .update({ published: false, published_at: null })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as JobRow;
      }

      // Gera slug: title → kebab-case + primeiros 8 chars do id
      const base = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      const slug = `${base}-${id.slice(0, 8)}`;

      const { data, error } = await supabase
        .from('jobs')
        .update({ published: true, slug, published_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as JobRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', data.id] });
    },
  });
}

export function useUpdateJobStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JobPipelineStage> & { id: string }) => {
      const { data, error } = await supabase
        .from('job_pipeline_stages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as JobPipelineStage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['job-stages', data.job_id] });
    },
  });
}
