
CREATE TABLE public.job_postings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  company text NOT NULL,
  location text NOT NULL,
  url text NOT NULL UNIQUE,
  source text NOT NULL,
  search_term text NOT NULL
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Permite leitura pública
CREATE POLICY "Anyone can view job_postings"
  ON public.job_postings FOR SELECT
  USING (true);

-- Permite inserção pública (anon + authenticated)
CREATE POLICY "Anyone can insert job_postings"
  ON public.job_postings FOR INSERT
  WITH CHECK (true);
