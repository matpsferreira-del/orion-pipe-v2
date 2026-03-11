
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS closing_salary numeric NULL,
  ADD COLUMN IF NOT EXISTS closing_candidate_id uuid NULL REFERENCES public.party(id),
  ADD COLUMN IF NOT EXISTS admission_date date NULL,
  ADD COLUMN IF NOT EXISTS closing_notes text NULL;
