
-- Função utilitária de timestamp (criar somente se não existir)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela principal de Projetos
CREATE TABLE public.outplacement_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type TEXT NOT NULL DEFAULT 'outplacement',
  status TEXT NOT NULL DEFAULT 'ativo',
  party_id UUID REFERENCES public.party(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  responsavel_id UUID,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  target_role TEXT,
  target_industry TEXT,
  target_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.outplacement_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.outplacement_projects(id) ON DELETE CASCADE,
  party_id UUID REFERENCES public.party(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  current_position TEXT,
  company_name TEXT,
  linkedin_url TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  contact_type TEXT NOT NULL DEFAULT 'outro',
  tier TEXT NOT NULL DEFAULT 'B',
  kanban_stage TEXT NOT NULL DEFAULT 'identificado',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outplacement_contacts_project ON public.outplacement_contacts(project_id);
CREATE INDEX idx_outplacement_contacts_stage ON public.outplacement_contacts(kanban_stage);

CREATE TABLE public.outplacement_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.outplacement_projects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.outplacement_contacts(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL DEFAULT 'outro',
  title TEXT NOT NULL,
  description TEXT,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outplacement_activities_project ON public.outplacement_activities(project_id);

CREATE TABLE public.outplacement_market_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.outplacement_projects(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  job_url TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'identificada',
  notes TEXT,
  applied_at DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outplacement_market_jobs_project ON public.outplacement_market_jobs(project_id);

ALTER TABLE public.outplacement_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outplacement_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outplacement_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outplacement_market_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view outplacement_projects" ON public.outplacement_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert outplacement_projects" ON public.outplacement_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update outplacement_projects" ON public.outplacement_projects FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete outplacement_projects" ON public.outplacement_projects FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view outplacement_contacts" ON public.outplacement_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert outplacement_contacts" ON public.outplacement_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update outplacement_contacts" ON public.outplacement_contacts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete outplacement_contacts" ON public.outplacement_contacts FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view outplacement_activities" ON public.outplacement_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert outplacement_activities" ON public.outplacement_activities FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update outplacement_activities" ON public.outplacement_activities FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete outplacement_activities" ON public.outplacement_activities FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view outplacement_market_jobs" ON public.outplacement_market_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert outplacement_market_jobs" ON public.outplacement_market_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update outplacement_market_jobs" ON public.outplacement_market_jobs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete outplacement_market_jobs" ON public.outplacement_market_jobs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_outplacement_projects_updated BEFORE UPDATE ON public.outplacement_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_outplacement_contacts_updated BEFORE UPDATE ON public.outplacement_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_outplacement_market_jobs_updated BEFORE UPDATE ON public.outplacement_market_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
