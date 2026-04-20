-- Tabela de menções/tags de oportunidades
CREATE TABLE public.opportunity_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL, -- profiles.id (do user marcado)
  mentioned_by_user_id UUID NOT NULL, -- profiles.id (de quem marcou)
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'sinalizada'
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_opportunity_mentions_opportunity ON public.opportunity_mentions(opportunity_id);
CREATE INDEX idx_opportunity_mentions_user_status ON public.opportunity_mentions(mentioned_user_id, status);

ALTER TABLE public.opportunity_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all mentions"
ON public.opportunity_mentions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert mentions"
ON public.opportunity_mentions FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update mentions"
ON public.opportunity_mentions FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete mentions"
ON public.opportunity_mentions FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_opportunity_mentions_updated_at
BEFORE UPDATE ON public.opportunity_mentions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();