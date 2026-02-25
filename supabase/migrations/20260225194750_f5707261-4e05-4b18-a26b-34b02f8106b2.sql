
-- Update the default pipeline stages function
CREATE OR REPLACE FUNCTION public.create_default_job_stages()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.job_pipeline_stages (job_id, name, position, color) VALUES
    (NEW.id, 'Candidatura', 0, '#6366f1'),
    (NEW.id, 'Triados', 1, '#8b5cf6'),
    (NEW.id, 'Entrevista', 2, '#a855f7'),
    (NEW.id, 'Shortlist', 3, '#ec4899'),
    (NEW.id, 'Entrevista Cliente', 4, '#f97316'),
    (NEW.id, 'Case', 5, '#eab308'),
    (NEW.id, 'Fechamento', 6, '#22c55e');
  RETURN NEW;
END;
$function$;
