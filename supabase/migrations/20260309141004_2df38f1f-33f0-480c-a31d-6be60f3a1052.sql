
-- Create cv_experiences table
CREATE TABLE IF NOT EXISTS public.cv_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.party(id) ON DELETE CASCADE,
  company TEXT,
  role TEXT,
  start_date TEXT,
  end_date TEXT,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cv_skills table
CREATE TABLE IF NOT EXISTS public.cv_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.party(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  level TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cv_education table
CREATE TABLE IF NOT EXISTS public.cv_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.party(id) ON DELETE CASCADE,
  institution TEXT,
  degree TEXT,
  field_of_study TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add CV columns to party table
ALTER TABLE public.party ADD COLUMN IF NOT EXISTS parsed_summary TEXT;
ALTER TABLE public.party ADD COLUMN IF NOT EXISTS total_exp_years NUMERIC(4,1);
ALTER TABLE public.party ADD COLUMN IF NOT EXISTS cv_parse_status TEXT DEFAULT 'pending';
ALTER TABLE public.party ADD COLUMN IF NOT EXISTS cv_parsed_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cv_exp_party ON public.cv_experiences(party_id);
CREATE INDEX IF NOT EXISTS idx_cv_skills_party ON public.cv_skills(party_id);
CREATE INDEX IF NOT EXISTS idx_cv_edu_party ON public.cv_education(party_id);

-- RLS for cv_experiences
ALTER TABLE public.cv_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cv_experiences" ON public.cv_experiences
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cv_experiences" ON public.cv_experiences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cv_experiences" ON public.cv_experiences
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cv_experiences" ON public.cv_experiences
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- RLS for cv_skills
ALTER TABLE public.cv_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cv_skills" ON public.cv_skills
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cv_skills" ON public.cv_skills
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cv_skills" ON public.cv_skills
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cv_skills" ON public.cv_skills
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- RLS for cv_education
ALTER TABLE public.cv_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cv_education" ON public.cv_education
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cv_education" ON public.cv_education
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cv_education" ON public.cv_education
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cv_education" ON public.cv_education
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
