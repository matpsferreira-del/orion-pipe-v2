
-- Replace the default job stages trigger to support outplacement projects
CREATE OR REPLACE FUNCTION public.create_default_job_stages()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if this is an outplacement project (no company)
  IF NEW.company_id IS NULL THEN
    INSERT INTO public.job_pipeline_stages (job_id, name, position, color) VALUES
      (NEW.id, 'Mapeados', 0, '#94a3b8'),
      (NEW.id, 'Abordados', 1, '#6366f1'),
      (NEW.id, 'Em Contato', 2, '#a855f7'),
      (NEW.id, 'Entrevistas', 3, '#f97316'),
      (NEW.id, 'Finalizado', 4, '#22c55e');
  ELSE
    INSERT INTO public.job_pipeline_stages (job_id, name, position, color) VALUES
      (NEW.id, 'Mapeado', -1, '#94a3b8'),
      (NEW.id, 'Candidatura', 0, '#6366f1'),
      (NEW.id, 'Triados', 1, '#8b5cf6'),
      (NEW.id, 'Entrevista', 2, '#a855f7'),
      (NEW.id, 'Shortlist', 3, '#ec4899'),
      (NEW.id, 'Entrevista Cliente', 4, '#f97316'),
      (NEW.id, 'Case', 5, '#eab308'),
      (NEW.id, 'Fechamento', 6, '#22c55e');
  END IF;
  RETURN NEW;
END;
$function$;
