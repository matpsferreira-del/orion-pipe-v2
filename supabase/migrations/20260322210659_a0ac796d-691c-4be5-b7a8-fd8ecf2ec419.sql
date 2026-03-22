
-- Drop the existing check constraint on tipo_servico and recreate with outplacement included
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_tipo_servico_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_tipo_servico_check 
  CHECK (tipo_servico IN ('recrutamento_pontual', 'programa_recorrente', 'rpo', 'hunting', 'consultoria', 'outplacement'));
