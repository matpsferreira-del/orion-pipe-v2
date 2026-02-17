
-- Function to get company counts (contacts and opportunities) in a single query
CREATE OR REPLACE FUNCTION public.get_company_counts()
RETURNS TABLE (
  company_id uuid,
  contacts_count bigint,
  opportunities_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    c.id AS company_id,
    (SELECT count(*) FROM contacts ct WHERE ct.company_id = c.id) AS contacts_count,
    (SELECT count(*) FROM opportunities o WHERE o.company_id = c.id) AS opportunities_count
  FROM companies c;
$$;
