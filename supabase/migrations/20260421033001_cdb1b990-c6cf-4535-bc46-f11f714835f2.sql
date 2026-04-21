-- Add Pathly sync fields to outplacement tables
ALTER TABLE public.outplacement_projects 
ADD COLUMN IF NOT EXISTS pathly_plan_id text,
ADD COLUMN IF NOT EXISTS pathly_synced_at timestamp with time zone;

ALTER TABLE public.outplacement_contacts
ADD COLUMN IF NOT EXISTS pathly_synced_at timestamp with time zone;

ALTER TABLE public.outplacement_market_jobs
ADD COLUMN IF NOT EXISTS pathly_synced_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_outplacement_projects_pathly_plan_id 
ON public.outplacement_projects(pathly_plan_id);