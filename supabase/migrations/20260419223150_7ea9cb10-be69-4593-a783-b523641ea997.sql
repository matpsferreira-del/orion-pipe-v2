-- Adiciona controle de débito automático e responsabilidade financeira
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS debito_automatico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reembolso boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reembolso_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_pagamento date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS forma_pagamento text DEFAULT NULL;

COMMENT ON COLUMN public.financial_transactions.debito_automatico IS 'Indica se a despesa/receita está em débito automático (cartão/conta).';
COMMENT ON COLUMN public.financial_transactions.responsavel_id IS 'Membro da equipe responsável (quando despesa foi paga por usuário e precisa reembolso, ou apenas rastreamento).';
COMMENT ON COLUMN public.financial_transactions.reembolso IS 'Marca se a despesa é um reembolso devido ao responsavel_id (em vez de paga pela Orion).';
COMMENT ON COLUMN public.financial_transactions.reembolso_status IS 'Status do reembolso: pendente | reembolsado | null (não aplicável).';
COMMENT ON COLUMN public.financial_transactions.data_pagamento IS 'Data efetiva de pagamento/recebimento.';
COMMENT ON COLUMN public.financial_transactions.forma_pagamento IS 'Forma: pix | boleto | cartao | transferencia | dinheiro | debito_automatico | outro.';

CREATE INDEX IF NOT EXISTS idx_ft_responsavel_id ON public.financial_transactions(responsavel_id) WHERE responsavel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ft_debito_automatico ON public.financial_transactions(debito_automatico) WHERE debito_automatico = true;
CREATE INDEX IF NOT EXISTS idx_ft_reembolso_pendente ON public.financial_transactions(reembolso_status) WHERE reembolso_status = 'pendente';

-- Constraint de validação para reembolso_status
ALTER TABLE public.financial_transactions
  DROP CONSTRAINT IF EXISTS check_reembolso_status;
ALTER TABLE public.financial_transactions
  ADD CONSTRAINT check_reembolso_status
  CHECK (reembolso_status IS NULL OR reembolso_status IN ('pendente', 'reembolsado'));