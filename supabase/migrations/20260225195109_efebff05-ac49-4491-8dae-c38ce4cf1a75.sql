
-- Step 1: Delete all existing pipeline stages (first nullify application references)
UPDATE public.applications SET stage_id = NULL WHERE stage_id IS NOT NULL;

-- Step 2: Delete all existing stages
DELETE FROM public.job_pipeline_stages;

-- Step 3: Re-create stages for ALL existing jobs with the new standard
INSERT INTO public.job_pipeline_stages (job_id, name, position, color)
SELECT j.id, s.name, s.position, s.color
FROM public.jobs j
CROSS JOIN (VALUES
  ('Candidatura', 0, '#6366f1'),
  ('Triados', 1, '#8b5cf6'),
  ('Entrevista', 2, '#a855f7'),
  ('Shortlist', 3, '#ec4899'),
  ('Entrevista Cliente', 4, '#f97316'),
  ('Case', 5, '#eab308'),
  ('Fechamento', 6, '#22c55e')
) AS s(name, position, color);

-- Step 4: Re-assign the application that was in "Triagem" to "Triados"
UPDATE public.applications a
SET stage_id = jps.id
FROM public.job_pipeline_stages jps
WHERE jps.job_id = a.job_id
  AND jps.name = 'Candidatura'
  AND a.stage_id IS NULL;
