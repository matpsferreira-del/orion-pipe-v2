
-- Enable pg_trgm extension for similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to find similar companies grouped by name similarity
CREATE OR REPLACE FUNCTION public.find_similar_companies(similarity_threshold float DEFAULT 0.4)
RETURNS TABLE (
  company_id_a uuid,
  company_name_a text,
  company_cidade_a text,
  company_estado_a text,
  company_status_a text,
  company_id_b uuid,
  company_name_b text,
  company_cidade_b text,
  company_estado_b text,
  company_status_b text,
  similarity_score float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    a.id AS company_id_a,
    a.nome_fantasia AS company_name_a,
    a.cidade AS company_cidade_a,
    a.estado AS company_estado_a,
    a.status AS company_status_a,
    b.id AS company_id_b,
    b.nome_fantasia AS company_name_b,
    b.cidade AS company_cidade_b,
    b.estado AS company_estado_b,
    b.status AS company_status_b,
    similarity(LOWER(a.nome_fantasia), LOWER(b.nome_fantasia))::float AS similarity_score
  FROM companies a
  JOIN companies b ON a.id < b.id
  WHERE similarity(LOWER(a.nome_fantasia), LOWER(b.nome_fantasia)) >= similarity_threshold
  ORDER BY similarity_score DESC;
$$;

-- Function to merge companies: moves all references and deletes the merged company
CREATE OR REPLACE FUNCTION public.merge_companies(survivor_id uuid, merged_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Move contacts
  UPDATE contacts SET company_id = survivor_id WHERE company_id = merged_id;
  
  -- Move opportunities
  UPDATE opportunities SET company_id = survivor_id WHERE company_id = merged_id;
  
  -- Move activities
  UPDATE activities SET company_id = survivor_id WHERE company_id = merged_id;
  
  -- Move tasks
  UPDATE tasks SET company_id = survivor_id WHERE company_id = merged_id;
  
  -- Move invoices
  UPDATE invoices SET company_id = survivor_id WHERE company_id = merged_id;
  
  -- Move jobs
  UPDATE jobs SET company_id = survivor_id WHERE company_id = merged_id;
  
  -- Update child companies pointing to merged
  UPDATE companies SET parent_company_id = survivor_id WHERE parent_company_id = merged_id;
  
  -- Update user_company_access - move access, ignore conflicts
  INSERT INTO user_company_access (user_id, company_id, access_level)
  SELECT user_id, survivor_id, access_level
  FROM user_company_access
  WHERE company_id = merged_id
  ON CONFLICT (user_id, company_id) DO NOTHING;
  
  DELETE FROM user_company_access WHERE company_id = merged_id;
  
  -- Delete the merged company
  DELETE FROM companies WHERE id = merged_id;
END;
$$;
