// ATS Types for Recruitment Management

export type JobStatus = 'draft' | 'open' | 'paused' | 'filled' | 'cancelled';
export type ApplicationStatus = 'new' | 'screening' | 'interviewing' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
export type JobPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type ApplicationSource = 'manual' | 'referral' | 'linkedin' | 'website' | 'hunting' | 'other';

export interface Job {
  id: string;
  company_id: string;
  contact_id: string | null;
  created_by: string;
  responsavel_id: string | null;
  title: string;
  description: string | null;
  requirements: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  status: JobStatus;
  priority: JobPriority;
  deadline: string | null;
  filled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobPipelineStage {
  id: string;
  job_id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  party_id: string;
  stage_id: string | null;
  status: ApplicationStatus;
  source: ApplicationSource;
  rating: number | null;
  notes: string | null;
  applied_at: string;
  updated_at: string;
}

export interface ApplicationHistory {
  id: string;
  application_id: string;
  from_stage_id: string | null;
  to_stage_id: string | null;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus | null;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

// Extended types with related data
export interface JobWithRelations extends Job {
  _company?: { nome_fantasia: string } | null;
  _contact?: { nome: string; cargo: string } | null;
  _responsavel?: { name: string; avatar?: string | null } | null;
  _applications_count?: number;
  _stages?: JobPipelineStage[];
}

export interface ApplicationWithRelations extends Application {
  _party?: {
    id: string;
    full_name: string;
    email_raw: string | null;
    phone_raw: string | null;
    headline: string | null;
    linkedin_url: string | null;
  } | null;
  _stage?: JobPipelineStage | null;
  _job?: { title: string; company_id: string } | null;
}

// Labels and display helpers
export const jobStatusLabels: Record<JobStatus, string> = {
  draft: 'Rascunho',
  open: 'Aberta',
  paused: 'Pausada',
  filled: 'Preenchida',
  cancelled: 'Cancelada',
};

export const jobStatusColors: Record<JobStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  filled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  new: 'Novo',
  screening: 'Triagem',
  interviewing: 'Entrevistando',
  offer: 'Proposta',
  hired: 'Contratado',
  rejected: 'Rejeitado',
  withdrawn: 'Desistiu',
};

export const priorityLabels: Record<JobPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const priorityColors: Record<JobPriority, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  alta: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  urgente: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const sourceLabels: Record<ApplicationSource, string> = {
  manual: 'Manual',
  referral: 'Indicação',
  linkedin: 'LinkedIn',
  website: 'Site',
  hunting: 'Hunting',
  other: 'Outro',
};
