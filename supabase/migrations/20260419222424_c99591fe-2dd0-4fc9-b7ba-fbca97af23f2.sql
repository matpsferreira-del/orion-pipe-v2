ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS outplacement_party_id uuid REFERENCES public.party(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.opportunities.outplacement_party_id IS 'Vínculo com o registro de Party (Banco de Talentos) para clientes Pessoa Física em projetos de Outplacement. Permite levar o candidato direto para a vaga gerada.';

CREATE INDEX IF NOT EXISTS idx_opportunities_outplacement_party_id ON public.opportunities(outplacement_party_id);