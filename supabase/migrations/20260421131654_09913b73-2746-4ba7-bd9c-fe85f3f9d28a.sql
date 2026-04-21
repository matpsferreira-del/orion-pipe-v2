-- Adiciona campos de perfil estratégico (alinhados com Pathly)
ALTER TABLE public.outplacement_projects
  ADD COLUMN IF NOT EXISTS situacao_atual text,
  ADD COLUMN IF NOT EXISTS modelo_trabalho text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS preferencia_regiao text,
  ADD COLUMN IF NOT EXISTS cidades_interesse jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.outplacement_projects.situacao_atual IS 'empregado | desempregado | em_transicao';
COMMENT ON COLUMN public.outplacement_projects.modelo_trabalho IS 'presencial | hibrido | remoto';
COMMENT ON COLUMN public.outplacement_projects.preferencia_regiao IS 'mesma_regiao | outras_regioes | indiferente';
COMMENT ON COLUMN public.outplacement_projects.cidades_interesse IS 'Array de objetos { estado, cidade }';