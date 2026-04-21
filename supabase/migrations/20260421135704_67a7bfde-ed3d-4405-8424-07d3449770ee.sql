ALTER TABLE public.outplacement_projects
  ADD COLUMN IF NOT EXISTS client_linkedin_url text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_phone text;