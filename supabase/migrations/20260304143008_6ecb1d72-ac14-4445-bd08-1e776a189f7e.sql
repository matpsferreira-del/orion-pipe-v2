CREATE OR REPLACE FUNCTION public.get_application_counts_by_job()
RETURNS TABLE(job_id uuid, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT a.job_id, COUNT(*) AS count
  FROM public.applications a
  GROUP BY a.job_id;
$$;