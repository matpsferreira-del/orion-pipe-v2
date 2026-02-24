
CREATE TABLE public.automation_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  search_term TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.automation_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert triggers"
  ON public.automation_triggers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view triggers"
  ON public.automation_triggers FOR SELECT
  USING (auth.uid() IS NOT NULL);
