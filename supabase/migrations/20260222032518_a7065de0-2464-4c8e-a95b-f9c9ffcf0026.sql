
-- Add proposal fields to opportunities table
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS proposal_sla text DEFAULT '10 a 12 dias úteis',
  ADD COLUMN IF NOT EXISTS proposal_exclusivity text DEFAULT 'com exclusividade no processo',
  ADD COLUMN IF NOT EXISTS proposal_guarantee text DEFAULT '30 dias',
  ADD COLUMN IF NOT EXISTS proposal_fee text DEFAULT '100%',
  ADD COLUMN IF NOT EXISTS proposal_payment_model text DEFAULT 'sucesso',
  ADD COLUMN IF NOT EXISTS proposal_retainer_type text DEFAULT '3x',
  ADD COLUMN IF NOT EXISTS proposal_fee_p1 text DEFAULT '30%',
  ADD COLUMN IF NOT EXISTS proposal_fee_p2 text DEFAULT '30%',
  ADD COLUMN IF NOT EXISTS proposal_fee_p3 text DEFAULT '40%';
