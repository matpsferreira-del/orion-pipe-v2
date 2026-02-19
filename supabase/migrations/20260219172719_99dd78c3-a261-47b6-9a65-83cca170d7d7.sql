
-- Function to merge all exact-name duplicates automatically
CREATE OR REPLACE FUNCTION public.merge_exact_duplicate_companies()
RETURNS TABLE(merged_name text, survivor_id uuid, merged_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  survivor uuid;
  dup uuid;
BEGIN
  FOR rec IN
    SELECT nome_fantasia,
           array_agg(id ORDER BY created_at ASC) AS ids,
           COUNT(*) AS total
    FROM companies
    GROUP BY nome_fantasia
    HAVING COUNT(*) > 1
  LOOP
    survivor := rec.ids[1];
    -- Merge each duplicate into the survivor
    FOR i IN 2..array_length(rec.ids, 1) LOOP
      dup := rec.ids[i];
      PERFORM merge_companies(survivor, dup);
    END LOOP;
    merged_name   := rec.nome_fantasia;
    survivor_id   := survivor;
    merged_count  := rec.total - 1;
    RETURN NEXT;
  END LOOP;
END;
$$;
