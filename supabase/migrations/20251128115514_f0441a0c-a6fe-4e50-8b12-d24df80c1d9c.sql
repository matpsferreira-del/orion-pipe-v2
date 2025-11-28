-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users/Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'consultor' CHECK (role IN ('admin', 'gestor', 'consultor')),
  avatar TEXT,
  team_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  site TEXT,
  segmento TEXT NOT NULL,
  porte TEXT NOT NULL DEFAULT 'media' CHECK (porte IN ('micro', 'pequena', 'media', 'grande', 'enterprise')),
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'cliente_ativo', 'cliente_inativo')),
  responsavel_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  observacoes TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Opportunities table
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id),
  responsavel_id UUID NOT NULL REFERENCES public.profiles(id),
  stage TEXT NOT NULL DEFAULT 'lead_identificado' CHECK (stage IN ('lead_identificado', 'contato_inicial', 'diagnostico_spin', 'proposta_enviada', 'negociacao', 'fechado_ganhou', 'fechado_perdeu', 'pos_venda')),
  valor_potencial NUMERIC(15,2) NOT NULL DEFAULT 0,
  probabilidade INTEGER NOT NULL DEFAULT 0 CHECK (probabilidade >= 0 AND probabilidade <= 100),
  data_previsao_fechamento DATE NOT NULL,
  origem_lead TEXT NOT NULL DEFAULT 'outro' CHECK (origem_lead IN ('indicacao', 'inbound', 'outbound', 'evento', 'linkedin', 'outro')),
  tipo_servico TEXT NOT NULL DEFAULT 'recrutamento_pontual' CHECK (tipo_servico IN ('recrutamento_pontual', 'programa_recorrente', 'rpo', 'hunting', 'consultoria')),
  observacoes TEXT,
  spin_situacao_como_contrata TEXT,
  spin_situacao_time_interno TEXT,
  spin_problema_dificuldades TEXT,
  spin_problema_tempo_medio TEXT,
  spin_implicacao_impacto TEXT,
  spin_implicacao_perda TEXT,
  spin_necessidade_cenario TEXT,
  spin_necessidade_urgencia TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL DEFAULT 'outro' CHECK (type IN ('ligacao', 'reuniao', 'email', 'followup', 'proposta', 'outro')),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  responsavel_id UUID NOT NULL REFERENCES public.profiles(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  numero_nota TEXT NOT NULL,
  cnpj_cliente TEXT NOT NULL,
  descricao_servico TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_emissao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'a_receber' CHECK (status IN ('a_receber', 'recebido', 'em_atraso', 'cancelado')),
  forma_pagamento TEXT NOT NULL DEFAULT 'boleto' CHECK (forma_pagamento IN ('boleto', 'pix', 'transferencia', 'cartao', 'outro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for companies (authenticated users can CRUD)
CREATE POLICY "Authenticated users can view companies" ON public.companies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update companies" ON public.companies
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete companies" ON public.companies
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for contacts
CREATE POLICY "Authenticated users can view contacts" ON public.contacts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert contacts" ON public.contacts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update contacts" ON public.contacts
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete contacts" ON public.contacts
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for opportunities
CREATE POLICY "Authenticated users can view opportunities" ON public.opportunities
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert opportunities" ON public.opportunities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update opportunities" ON public.opportunities
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete opportunities" ON public.opportunities
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for activities
CREATE POLICY "Authenticated users can view activities" ON public.activities
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update activities" ON public.activities
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete activities" ON public.activities
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for tasks
CREATE POLICY "Authenticated users can view tasks" ON public.tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tasks" ON public.tasks
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for invoices
CREATE POLICY "Authenticated users can view invoices" ON public.invoices
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invoices" ON public.invoices
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete invoices" ON public.invoices
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_companies_status ON public.companies(status);
CREATE INDEX idx_companies_responsavel ON public.companies(responsavel_id);
CREATE INDEX idx_contacts_company ON public.contacts(company_id);
CREATE INDEX idx_opportunities_company ON public.opportunities(company_id);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX idx_opportunities_responsavel ON public.opportunities(responsavel_id);
CREATE INDEX idx_activities_opportunity ON public.activities(opportunity_id);
CREATE INDEX idx_activities_company ON public.activities(company_id);
CREATE INDEX idx_tasks_responsavel ON public.tasks(responsavel_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_invoices_company ON public.invoices(company_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;