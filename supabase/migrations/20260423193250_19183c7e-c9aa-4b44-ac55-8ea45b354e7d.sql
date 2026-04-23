-- Tabela de atividades para perfis dentro de estratégias comerciais
CREATE TABLE public.commercial_strategy_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.commercial_strategy_groups(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.commercial_strategy_members(id) ON DELETE CASCADE,
  party_id UUID NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'outro',
  lead_status TEXT NOT NULL DEFAULT 'frio',
  title TEXT NOT NULL,
  description TEXT,
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_csa_member ON public.commercial_strategy_activities(member_id);
CREATE INDEX idx_csa_group ON public.commercial_strategy_activities(group_id);
CREATE INDEX idx_csa_party ON public.commercial_strategy_activities(party_id);
CREATE INDEX idx_csa_date ON public.commercial_strategy_activities(activity_date DESC);

-- Validação de tipos permitidos
CREATE OR REPLACE FUNCTION public.validate_csa_enums()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.activity_type NOT IN ('email','ligacao','reuniao','linkedin','whatsapp','followup','outro') THEN
    RAISE EXCEPTION 'activity_type inválido: %', NEW.activity_type;
  END IF;
  IF NEW.lead_status NOT IN ('frio','morno','quente','convertido','perdido') THEN
    RAISE EXCEPTION 'lead_status inválido: %', NEW.lead_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_csa_enums
BEFORE INSERT OR UPDATE ON public.commercial_strategy_activities
FOR EACH ROW EXECUTE FUNCTION public.validate_csa_enums();

CREATE TRIGGER trg_csa_updated_at
BEFORE UPDATE ON public.commercial_strategy_activities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.commercial_strategy_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view csa"
ON public.commercial_strategy_activities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert csa"
ON public.commercial_strategy_activities FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update csa"
ON public.commercial_strategy_activities FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete csa"
ON public.commercial_strategy_activities FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);