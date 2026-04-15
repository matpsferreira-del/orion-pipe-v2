
-- Create storage bucket for financial documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('financial-documents', 'financial-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for financial-documents bucket
CREATE POLICY "Authenticated users can upload financial documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'financial-documents');

CREATE POLICY "Authenticated users can view financial documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'financial-documents');

CREATE POLICY "Admins can delete financial documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'financial-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create financial_documents table
CREATE TABLE public.financial_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  financial_transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'nf' CHECK (document_type IN ('nf', 'boleto')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  numero_documento TEXT,
  valor_documento NUMERIC,
  cnpj_emitente TEXT,
  data_vencimento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view financial documents"
ON public.financial_documents FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins and gestors can insert financial documents"
ON public.financial_documents FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role));

CREATE POLICY "Admins and gestors can update financial documents"
ON public.financial_documents FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role));

CREATE POLICY "Admins can delete financial documents"
ON public.financial_documents FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
