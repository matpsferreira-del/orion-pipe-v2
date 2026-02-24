
-- 1. Vínculo oportunidade -> vaga
ALTER TABLE public.jobs
  ADD COLUMN opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- 2. Pretensão salarial na candidatura
ALTER TABLE public.applications
  ADD COLUMN salary_expectation numeric;
