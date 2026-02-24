
-- Add new columns
ALTER TABLE public.job_postings ADD COLUMN cidade text;
ALTER TABLE public.job_postings ADD COLUMN estado text;

-- Best-effort migration: try to extract city and state from location
-- Pattern: "City - UF", "City/UF", "City, UF", "City (UF)"
UPDATE public.job_postings
SET 
  cidade = TRIM(SPLIT_PART(REGEXP_REPLACE(location, '\s*[\-/,]\s*([A-Z]{2})$', '', 'i'), '(', 1)),
  estado = UPPER((REGEXP_MATCH(location, '([A-Z]{2})\s*$'))[1])
WHERE location IS NOT NULL AND location != '';

-- Drop the old column
ALTER TABLE public.job_postings DROP COLUMN location;
