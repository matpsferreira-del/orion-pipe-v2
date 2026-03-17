
-- Create chart_of_accounts table
CREATE TABLE public.chart_of_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pacote text NOT NULL,
  conta_contabil text NOT NULL,
  tipo text NOT NULL,
  ordem integer,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create validation trigger for tipo
CREATE OR REPLACE FUNCTION public.validate_chart_of_accounts_tipo()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo NOT IN ('receita', 'deducao', 'custo', 'despesa') THEN
    RAISE EXCEPTION 'tipo must be one of: receita, deducao, custo, despesa';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_chart_tipo
  BEFORE INSERT OR UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.validate_chart_of_accounts_tipo();

-- RLS for chart_of_accounts
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view chart_of_accounts"
  ON public.chart_of_accounts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage chart_of_accounts"
  ON public.chart_of_accounts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create financial_transactions table
CREATE TABLE public.financial_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pacote text NOT NULL,
  conta_contabil text NOT NULL,
  descricao text,
  valor numeric NOT NULL,
  data_referencia date NOT NULL,
  data_vencimento date NOT NULL,
  status text DEFAULT 'pendente',
  recorrente boolean DEFAULT false,
  recorrencia_meses integer,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_financial_transaction_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('pendente', 'pago', 'cancelado') THEN
    RAISE EXCEPTION 'status must be one of: pendente, pago, cancelado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_ft_status
  BEFORE INSERT OR UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_transaction_status();

-- Updated_at trigger
CREATE TRIGGER trg_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS for financial_transactions
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view financial_transactions"
  ON public.financial_transactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and gestors can insert financial_transactions"
  ON public.financial_transactions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admins and gestors can update financial_transactions"
  ON public.financial_transactions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admins can delete financial_transactions"
  ON public.financial_transactions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
