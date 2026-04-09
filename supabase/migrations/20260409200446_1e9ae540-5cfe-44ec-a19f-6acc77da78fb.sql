
-- Table for opportunity file attachments
CREATE TABLE public.opportunity_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunity_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view attachments"
ON public.opportunity_attachments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert attachments"
ON public.opportunity_attachments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete attachments"
ON public.opportunity_attachments FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Storage bucket for opportunity attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('opportunity-attachments', 'opportunity-attachments', true);

CREATE POLICY "Anyone can read opportunity attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'opportunity-attachments');

CREATE POLICY "Authenticated users can upload opportunity attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'opportunity-attachments');

CREATE POLICY "Authenticated users can delete opportunity attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'opportunity-attachments');

-- Add rejection reason to opportunities
ALTER TABLE public.opportunities ADD COLUMN motivo_rejeicao TEXT;
