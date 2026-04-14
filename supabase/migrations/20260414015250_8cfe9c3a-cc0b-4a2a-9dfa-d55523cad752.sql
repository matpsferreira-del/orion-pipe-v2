
-- 1. Create enum for contract models
CREATE TYPE public.contract_model AS ENUM (
  'sucesso_mensal',
  'sucesso_anual',
  'retainer_mensal',
  'retainer_anual',
  'rpo',
  'outplacement_mentoria',
  'outplacement_sem_mentoria'
);

-- 2. Create enum for milestone types
CREATE TYPE public.contract_milestone_type AS ENUM (
  'abertura_vaga',
  'envio_shortlist',
  'finalizacao_vaga',
  'inicio_outplacement',
  'sucesso_outplacement',
  'rpo_ciclo_mensal',
  'ajuste_reconciliacao'
);

-- 3. Create enum for milestone status
CREATE TYPE public.milestone_status AS ENUM (
  'previsto',
  'a_receber',
  'recebido',
  'cancelado'
);

-- 4. Add contract fields to jobs table
ALTER TABLE public.jobs
  ADD COLUMN modelo_contrato public.contract_model DEFAULT NULL,
  ADD COLUMN salario_meta numeric DEFAULT NULL,
  ADD COLUMN bonus_anual_meta numeric DEFAULT 0,
  ADD COLUMN fee_percentual numeric DEFAULT NULL,
  ADD COLUMN garantia_dias integer DEFAULT 90,
  ADD COLUMN bonus_anual_final numeric DEFAULT NULL,
  -- Retainer fields
  ADD COLUMN retainer_parcelas text DEFAULT '3x',
  ADD COLUMN retainer_marco_1 text DEFAULT 'abertura_vaga',
  ADD COLUMN retainer_marco_2 text DEFAULT 'envio_shortlist',
  ADD COLUMN retainer_marco_3 text DEFAULT 'finalizacao_vaga',
  ADD COLUMN retainer_perc_1 numeric DEFAULT 33,
  ADD COLUMN retainer_perc_2 numeric DEFAULT 33,
  ADD COLUMN retainer_perc_3 numeric DEFAULT 34,
  -- Outplacement fields
  ADD COLUMN outplacement_perc_inicio numeric DEFAULT 50,
  ADD COLUMN outplacement_perc_sucesso numeric DEFAULT 50,
  -- RPO fields
  ADD COLUMN rpo_duracao_meses integer DEFAULT NULL,
  ADD COLUMN rpo_media_vagas_mes numeric DEFAULT NULL,
  ADD COLUMN rpo_vagas_iniciais_mes numeric DEFAULT NULL,
  ADD COLUMN rpo_vagas_medias_mes numeric DEFAULT NULL,
  ADD COLUMN rpo_vagas_complexas_mes numeric DEFAULT NULL,
  ADD COLUMN rpo_custo_consultor_inicial numeric DEFAULT NULL,
  ADD COLUMN rpo_custo_consultor_medio numeric DEFAULT NULL,
  ADD COLUMN rpo_custo_consultor_complexo numeric DEFAULT NULL,
  ADD COLUMN rpo_valor_mensal_cliente numeric DEFAULT NULL;

-- 5. Create job_contract_milestones table
CREATE TABLE public.job_contract_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  milestone_type public.contract_milestone_type NOT NULL,
  percentage numeric DEFAULT NULL,
  valor numeric NOT NULL DEFAULT 0,
  status public.milestone_status NOT NULL DEFAULT 'previsto',
  financial_transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL DEFAULT NULL,
  triggered_at timestamp with time zone DEFAULT NULL,
  rpo_cycle_month text DEFAULT NULL,
  description text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. Add job_id column to financial_transactions for linking
ALTER TABLE public.financial_transactions
  ADD COLUMN job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL DEFAULT NULL;

-- 7. Enable RLS on job_contract_milestones
ALTER TABLE public.job_contract_milestones ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies for job_contract_milestones
CREATE POLICY "Authenticated users can view milestones"
  ON public.job_contract_milestones
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and gestors can insert milestones"
  ON public.job_contract_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Admins and gestors can update milestones"
  ON public.job_contract_milestones
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Admins can delete milestones"
  ON public.job_contract_milestones
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. Index for fast lookups
CREATE INDEX idx_job_contract_milestones_job_id ON public.job_contract_milestones(job_id);
CREATE INDEX idx_financial_transactions_job_id ON public.financial_transactions(job_id);

-- 10. Trigger for updated_at on milestones
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.job_contract_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
