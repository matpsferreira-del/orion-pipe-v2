import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Application, ApplicationStatus, ApplicationWithRelations } from '@/types/ats';

export type ApplicationRow = Application;
export type ApplicationInsert = Omit<Application, 'id' | 'applied_at' | 'updated_at'>;
export type ApplicationUpdate = Partial<ApplicationInsert>;

export function useApplications(jobId?: string) {
  return useQuery({
    queryKey: ['applications', jobId],
    queryFn: async () => {
      let query = supabase
        .from('applications')
        .select('*')
        .order('applied_at', { ascending: false });

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ApplicationRow[];
    },
  });
}

export function useApplicationsWithParties(jobId: string) {
  return useQuery({
    queryKey: ['applications-with-parties', jobId],
    queryFn: async () => {
      // First get applications
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false });

      if (appError) throw appError;
      if (!applications?.length) return [];

      // Get unique party IDs
      const partyIds = [...new Set(applications.map(a => a.party_id))];
      
      // Fetch parties
      const { data: parties, error: partyError } = await supabase
        .from('party')
        .select('id, full_name, email_raw, phone_raw, headline, linkedin_url')
        .in('id', partyIds);

      if (partyError) throw partyError;

      // Get stages for this job
      const { data: stages, error: stageError } = await supabase
        .from('job_pipeline_stages')
        .select('*')
        .eq('job_id', jobId);

      if (stageError) throw stageError;

      // Map parties and stages to applications
      const partyMap = new Map(parties?.map(p => [p.id, p]));
      const stageMap = new Map(stages?.map(s => [s.id, s]));

      return applications.map(app => ({
        ...app,
        _party: partyMap.get(app.party_id) || null,
        _stage: app.stage_id ? stageMap.get(app.stage_id) || null : null,
      })) as ApplicationWithRelations[];
    },
    enabled: !!jobId,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (application: ApplicationInsert) => {
      const { data, error } = await supabase
        .from('applications')
        .insert(application)
        .select()
        .single();

      if (error) throw error;
      return data as ApplicationRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications', data.job_id] });
      queryClient.invalidateQueries({ queryKey: ['applications-with-parties', data.job_id] });
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ApplicationUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ApplicationRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications', data.job_id] });
      queryClient.invalidateQueries({ queryKey: ['applications-with-parties', data.job_id] });
    },
  });
}

export function useUpdateApplicationStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stage_id, job_id }: { id: string; stage_id: string; job_id: string }) => {
      const { data, error } = await supabase
        .from('applications')
        .update({ stage_id })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, job_id } as ApplicationRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications', data.job_id] });
      queryClient.invalidateQueries({ queryKey: ['applications-with-parties', data.job_id] });
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) => {
      const { data, error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ApplicationRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications', data.job_id] });
      queryClient.invalidateQueries({ queryKey: ['applications-with-parties', data.job_id] });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, job_id }: { id: string; job_id: string }) => {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return job_id;
    },
    onSuccess: (job_id) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications', job_id] });
      queryClient.invalidateQueries({ queryKey: ['applications-with-parties', job_id] });
    },
  });
}
