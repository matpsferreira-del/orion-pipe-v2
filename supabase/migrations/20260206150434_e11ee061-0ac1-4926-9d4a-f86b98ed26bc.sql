-- =============================================
-- PHASE 2: Jobs & ATS Pipeline
-- =============================================

-- Enum for job status
CREATE TYPE public.job_status AS ENUM ('draft', 'open', 'paused', 'filled', 'cancelled');

-- Enum for application status
CREATE TYPE public.application_status AS ENUM ('new', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn');

-- Jobs table (Vagas)
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  location TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  
  status job_status NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  
  deadline DATE,
  filled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job pipeline stages (customizable per job)
CREATE TABLE public.job_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Applications (Candidaturas)
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.party(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.job_pipeline_stages(id) ON DELETE SET NULL,
  
  status application_status NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'referral', 'linkedin', 'website', 'hunting', 'other')),
  
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(job_id, party_id)
);

-- Application history (for tracking stage changes)
CREATE TABLE public.application_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  
  from_stage_id UUID REFERENCES public.job_pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id UUID REFERENCES public.job_pipeline_stages(id) ON DELETE SET NULL,
  from_status application_status,
  to_status application_status,
  
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs
CREATE POLICY "Users can view jobs from accessible companies"
ON public.jobs FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert jobs for accessible companies"
ON public.jobs FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  company_id IN (SELECT company_id FROM user_company_access WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update jobs they are responsible for"
ON public.jobs FOR UPDATE
USING (
  responsavel_id = get_user_profile_id(auth.uid()) OR
  created_by = get_user_profile_id(auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Only admins can delete jobs"
ON public.jobs FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for job_pipeline_stages
CREATE POLICY "Users can view stages for accessible jobs"
ON public.job_pipeline_stages FOR SELECT
USING (
  job_id IN (SELECT id FROM jobs)
);

CREATE POLICY "Users can manage stages for jobs they manage"
ON public.job_pipeline_stages FOR ALL
USING (
  job_id IN (
    SELECT id FROM jobs 
    WHERE responsavel_id = get_user_profile_id(auth.uid())
    OR created_by = get_user_profile_id(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  )
)
WITH CHECK (
  job_id IN (
    SELECT id FROM jobs 
    WHERE responsavel_id = get_user_profile_id(auth.uid())
    OR created_by = get_user_profile_id(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  )
);

-- RLS Policies for applications
CREATE POLICY "Users can view applications for accessible jobs"
ON public.applications FOR SELECT
USING (
  job_id IN (SELECT id FROM jobs)
);

CREATE POLICY "Users can insert applications for accessible jobs"
ON public.applications FOR INSERT
WITH CHECK (
  job_id IN (SELECT id FROM jobs)
);

CREATE POLICY "Users can update applications for accessible jobs"
ON public.applications FOR UPDATE
USING (
  job_id IN (
    SELECT id FROM jobs 
    WHERE responsavel_id = get_user_profile_id(auth.uid())
    OR created_by = get_user_profile_id(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  )
);

CREATE POLICY "Only admins can delete applications"
ON public.applications FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for application_history
CREATE POLICY "Users can view history for accessible applications"
ON public.application_history FOR SELECT
USING (
  application_id IN (SELECT id FROM applications)
);

CREATE POLICY "Users can insert history for accessible applications"
ON public.application_history FOR INSERT
WITH CHECK (
  application_id IN (SELECT id FROM applications)
);

-- Indexes for performance
CREATE INDEX idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_responsavel_id ON public.jobs(responsavel_id);
CREATE INDEX idx_job_pipeline_stages_job_id ON public.job_pipeline_stages(job_id);
CREATE INDEX idx_applications_job_id ON public.applications(job_id);
CREATE INDEX idx_applications_party_id ON public.applications(party_id);
CREATE INDEX idx_applications_stage_id ON public.applications(stage_id);
CREATE INDEX idx_application_history_application_id ON public.application_history(application_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_jobs_updated_at();

CREATE OR REPLACE FUNCTION public.update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_applications_updated_at();

-- Function to create default pipeline stages for a new job
CREATE OR REPLACE FUNCTION public.create_default_job_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.job_pipeline_stages (job_id, name, position, color) VALUES
    (NEW.id, 'Triagem', 0, '#6366f1'),
    (NEW.id, 'Entrevista RH', 1, '#8b5cf6'),
    (NEW.id, 'Entrevista Técnica', 2, '#a855f7'),
    (NEW.id, 'Case/Teste', 3, '#d946ef'),
    (NEW.id, 'Entrevista Final', 4, '#ec4899'),
    (NEW.id, 'Proposta', 5, '#f97316');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER create_default_stages_on_job_insert
AFTER INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.create_default_job_stages();

-- Function to log application stage/status changes
CREATE OR REPLACE FUNCTION public.log_application_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.application_history (
      application_id,
      from_stage_id,
      to_stage_id,
      from_status,
      to_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.stage_id,
      NEW.stage_id,
      OLD.status,
      NEW.status,
      get_user_profile_id(auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER log_application_changes_trigger
AFTER UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.log_application_changes();