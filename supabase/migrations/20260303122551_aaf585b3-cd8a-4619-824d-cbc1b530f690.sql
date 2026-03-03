
-- 1. Add job_code column
ALTER TABLE public.jobs ADD COLUMN job_code INTEGER UNIQUE;

-- 2. Create sequence
CREATE SEQUENCE public.job_code_seq;

-- 3. Backfill existing jobs with sequential codes based on creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.jobs
)
UPDATE public.jobs SET job_code = numbered.rn
FROM numbered WHERE jobs.id = numbered.id;

-- 4. Set sequence to continue after existing jobs
SELECT setval('public.job_code_seq', COALESCE((SELECT MAX(job_code) FROM public.jobs), 0));

-- 5. Create trigger function to auto-assign code
CREATE OR REPLACE FUNCTION public.assign_job_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.job_code := nextval('public.job_code_seq');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Create trigger
CREATE TRIGGER set_job_code_trigger
BEFORE INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.assign_job_code();
