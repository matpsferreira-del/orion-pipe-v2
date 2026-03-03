
CREATE OR REPLACE FUNCTION public.activate_company_on_deal_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.stage = 'fechado_ganhou' AND (OLD.stage IS DISTINCT FROM 'fechado_ganhou') THEN
    UPDATE public.companies
    SET status = 'cliente_ativo', updated_at = now()
    WHERE id = NEW.company_id AND status != 'cliente_ativo';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activate_company_on_deal_won
AFTER UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.activate_company_on_deal_won();
