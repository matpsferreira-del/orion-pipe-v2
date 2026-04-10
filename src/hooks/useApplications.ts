import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Application, ApplicationStatus, ApplicationWithRelations, applicationStatusLabels, sourceLabels } from '@/types/ats';

export { applicationStatusLabels, sourceLabels };

export type ApplicationRow = Application;
export type ApplicationInsert = Omit<Application, 'id' | 'applied_at' | 'updated_at'>;
export type ApplicationUpdate = Partial<ApplicationInsert>;

export function useApplications(jobId?: string) {
  return useQuery({
    queryKey: ['applications', jobId],
    queryFn: async () => {
      if (jobId) {
        return await fetchAllApplications(jobId) as ApplicationRow[];
      }
      // Fetch ALL applications with pagination
      const allData: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .order('applied_at', { ascending: false })
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allData.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      return allData as ApplicationRow[];
    },
  });
}

async function fetchAllApplications(jobId: string) {
  const allData: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }
  return allData;
}

async function fetchAllParties(partyIds: string[]) {
  const allData: any[] = [];
  // .in() has a practical limit, batch in chunks of 500
  for (let i = 0; i < partyIds.length; i += 500) {
    const batch = partyIds.slice(i, i + 500);
    const { data, error } = await supabase
      .from('party')
      .select('id, full_name, email_raw, phone_raw, headline, linkedin_url, photo_url, current_title, current_company, city, state, tags')
      .in('id', batch);
    if (error) throw error;
    if (data) allData.push(...data);
  }
  return allData;
}

export function useApplicationsWithParties(jobId: string) {
  return useQuery({
    queryKey: ['applications-with-parties', jobId],
    queryFn: async () => {
      const applications = await fetchAllApplications(jobId);
      if (!applications.length) return [];

      const partyIds = [...new Set(applications.map(a => a.party_id))] as string[];
      
      const [parties, stages] = await Promise.all([
        fetchAllParties(partyIds),
        supabase
          .from('job_pipeline_stages')
          .select('*')
          .eq('job_id', jobId)
          .then(({ data, error }) => { if (error) throw error; return data; }),
      ]);

      const partyMap = new Map(parties.map(p => [p.id, p]));
      const stageMap = new Map((stages || []).map(s => [s.id, s]));

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

export interface PartyApplication {
  id: string;
  job_id: string;
  party_id: string;
  stage_id: string | null;
  status: string;
  source: string;
  rating: number | null;
  notes: string | null;
  applied_at: string;
  updated_at: string;
  _job: { id: string; title: string; company_id: string; _company?: { nome_fantasia: string } | null } | null;
  _stage: { id: string; name: string; color: string } | null;
}

export function usePartyApplications(partyId: string | undefined) {
  return useQuery({
    queryKey: ['party-applications', partyId],
    queryFn: async () => {
      if (!partyId) return [];

      // Fetch applications for this party
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('party_id', partyId)
        .order('applied_at', { ascending: false });

      if (appError) throw appError;
      if (!applications?.length) return [] as PartyApplication[];

      // Fetch jobs
      const jobIds = [...new Set(applications.map(a => a.job_id))];
      const { data: jobs, error: jobError } = await supabase
        .from('jobs')
        .select('id, title, company_id')
        .in('id', jobIds);

      if (jobError) throw jobError;

      // Fetch companies
      const companyIds = [...new Set((jobs || []).map(j => j.company_id))];
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id, nome_fantasia')
        .in('id', companyIds);

      if (companyError) throw companyError;

      // Fetch stages
      const stageIds = applications.map(a => a.stage_id).filter(Boolean) as string[];
      let stages: { id: string; name: string; color: string }[] = [];
      if (stageIds.length > 0) {
        const { data: stageData } = await supabase
          .from('job_pipeline_stages')
          .select('id, name, color')
          .in('id', stageIds);
        stages = stageData || [];
      }

      const jobMap = new Map((jobs || []).map(j => [j.id, j]));
      const companyMap = new Map((companies || []).map(c => [c.id, c]));
      const stageMap = new Map(stages.map(s => [s.id, s]));

      return applications.map(app => {
        const job = jobMap.get(app.job_id) || null;
        const company = job ? companyMap.get(job.company_id) || null : null;
        return {
          ...app,
          _job: job ? { ...job, _company: company } : null,
          _stage: app.stage_id ? stageMap.get(app.stage_id) || null : null,
        } as PartyApplication;
      });
    },
    enabled: !!partyId,
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

export function useApplicationHistory(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['application-history', applicationId],
    enabled: !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_history')
        .select('*')
        .eq('application_id', applicationId!)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch stage names
      const stageIds = [...new Set([
        ...data.map(h => h.from_stage_id).filter(Boolean),
        ...data.map(h => h.to_stage_id).filter(Boolean),
      ])] as string[];

      let stageMap = new Map<string, string>();
      if (stageIds.length > 0) {
        const { data: stages } = await supabase
          .from('job_pipeline_stages')
          .select('id, name')
          .in('id', stageIds);
        stageMap = new Map((stages || []).map(s => [s.id, s.name]));
      }

      return data.map(h => ({
        ...h,
        _from_stage_name: h.from_stage_id ? stageMap.get(h.from_stage_id) || null : null,
        _to_stage_name: h.to_stage_id ? stageMap.get(h.to_stage_id) || null : null,
      }));
    },
  });
}
