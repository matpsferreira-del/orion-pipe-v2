import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  createPathlyPlan,
  syncContactToPathly,
  syncMarketJobToPathly,
} from '@/lib/pathlySync';

export interface OutplacementProject {
  id: string;
  project_type: string;
  status: string;
  party_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  responsavel_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  target_role: string | null;
  target_industry: string | null;
  target_location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  pathly_plan_id: string | null;
  pathly_synced_at: string | null;
}

export interface OutplacementContact {
  id: string;
  project_id: string;
  party_id: string | null;
  name: string;
  current_position: string | null;
  company_name: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  contact_type: string;
  tier: string;
  kanban_stage: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  ai_validated_at: string | null;
  pathly_synced_at: string | null;
}

export interface OutplacementActivity {
  id: string;
  project_id: string;
  contact_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  activity_date: string;
  created_by: string | null;
  created_at: string;
}

export interface OutplacementMarketJob {
  id: string;
  project_id: string;
  job_title: string;
  company_name: string;
  location: string | null;
  job_url: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  applied_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  pathly_synced_at: string | null;
}

export const KANBAN_STAGES = [
  { key: 'identificado', label: 'Identificado', color: 'bg-slate-500' },
  { key: 'convite_enviado', label: 'Convite Enviado', color: 'bg-blue-500' },
  { key: 'conectado', label: 'Conectado', color: 'bg-cyan-500' },
  { key: 'msg_enviada', label: 'Mensagem Enviada', color: 'bg-indigo-500' },
  { key: 'respondeu', label: 'Respondeu', color: 'bg-violet-500' },
  { key: 'reuniao_agendada', label: 'Reunião Agendada', color: 'bg-emerald-500' },
] as const;

export const TIER_LABELS: Record<string, string> = { A: 'Tier A', B: 'Tier B', C: 'Tier C' };
export const CONTACT_TYPE_LABELS: Record<string, string> = {
  decisor: 'Decisor',
  rh: 'RH',
  recrutador: 'Recrutador',
  indicacao: 'Indicação',
  outro: 'Outro',
};
export const MARKET_JOB_STATUS_LABELS: Record<string, string> = {
  identificada: 'Identificada',
  aplicada: 'Aplicada',
  entrevista: 'Entrevista',
  oferta: 'Oferta',
  rejeitada: 'Rejeitada',
  descartada: 'Descartada',
};

// PROJECTS
export function useOutplacementProjects() {
  return useQuery({
    queryKey: ['outplacement-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outplacement_projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OutplacementProject[];
    },
  });
}

export function useOutplacementProject(id: string | undefined) {
  return useQuery({
    queryKey: ['outplacement-project', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('outplacement_projects')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as OutplacementProject;
    },
    enabled: !!id,
  });
}

export function useCreateOutplacementProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<OutplacementProject> & { title: string; created_by: string }) => {
      const { data, error } = await supabase.from('outplacement_projects').insert(input).select().single();
      if (error) throw error;
      return data as OutplacementProject;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outplacement-projects'] });
      toast.success('Projeto criado!');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdateOutplacementProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OutplacementProject> & { id: string }) => {
      const { error } = await supabase.from('outplacement_projects').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['outplacement-projects'] });
      qc.invalidateQueries({ queryKey: ['outplacement-project', vars.id] });
      toast.success('Projeto atualizado!');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteOutplacementProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('outplacement_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outplacement-projects'] });
      toast.success('Projeto excluído');
    },
  });
}

// CONTACTS
export function useOutplacementContacts(projectId?: string) {
  return useQuery({
    queryKey: ['outplacement-contacts', projectId || 'all'],
    queryFn: async () => {
      let q = supabase.from('outplacement_contacts').select('*').order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as OutplacementContact[];
    },
  });
}

export function useCreateOutplacementContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<OutplacementContact> & { project_id: string; name: string }) => {
      const { data, error } = await supabase.from('outplacement_contacts').insert(input).select().single();
      if (error) throw error;
      return data as OutplacementContact;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['outplacement-contacts'] });
      qc.invalidateQueries({ queryKey: ['outplacement-contacts', data.project_id] });
      toast.success('Contato adicionado!');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdateOutplacementContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OutplacementContact> & { id: string }) => {
      const { error } = await supabase.from('outplacement_contacts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outplacement-contacts'] });
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteOutplacementContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('outplacement_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outplacement-contacts'] });
      toast.success('Contato removido');
    },
  });
}

// ACTIVITIES
export function useOutplacementActivities(projectId: string | undefined) {
  return useQuery({
    queryKey: ['outplacement-activities', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('outplacement_activities')
        .select('*')
        .eq('project_id', projectId)
        .order('activity_date', { ascending: false });
      if (error) throw error;
      return data as OutplacementActivity[];
    },
    enabled: !!projectId,
  });
}

export function useCreateOutplacementActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<OutplacementActivity> & { project_id: string; title: string }) => {
      const { data, error } = await supabase.from('outplacement_activities').insert(input).select().single();
      if (error) throw error;
      return data as OutplacementActivity;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['outplacement-activities', data.project_id] });
      toast.success('Atividade registrada!');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteOutplacementActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('outplacement_activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outplacement-activities'] }),
  });
}

// MARKET JOBS
export function useOutplacementMarketJobs(projectId: string | undefined) {
  return useQuery({
    queryKey: ['outplacement-market-jobs', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('outplacement_market_jobs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OutplacementMarketJob[];
    },
    enabled: !!projectId,
  });
}

export function useCreateOutplacementMarketJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<OutplacementMarketJob> & { project_id: string; job_title: string; company_name: string }) => {
      const { data, error } = await supabase.from('outplacement_market_jobs').insert(input).select().single();
      if (error) throw error;
      return data as OutplacementMarketJob;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['outplacement-market-jobs', data.project_id] });
      toast.success('Vaga adicionada!');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdateOutplacementMarketJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OutplacementMarketJob> & { id: string }) => {
      const { error } = await supabase.from('outplacement_market_jobs').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outplacement-market-jobs'] }),
  });
}

export function useDeleteOutplacementMarketJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('outplacement_market_jobs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outplacement-market-jobs'] });
      toast.success('Vaga removida');
    },
  });
}
