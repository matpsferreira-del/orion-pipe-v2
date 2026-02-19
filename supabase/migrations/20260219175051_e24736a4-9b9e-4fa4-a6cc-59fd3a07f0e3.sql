
-- 1. Adicionar colunas published, slug e published_at na tabela jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Índice para busca pública rápida por slug
CREATE INDEX IF NOT EXISTS jobs_slug_idx ON public.jobs (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS jobs_published_idx ON public.jobs (published, status) WHERE published = true;

-- 2. RLS: Leitura pública de vagas publicadas (sem autenticação)
CREATE POLICY "Public can view published jobs"
  ON public.jobs FOR SELECT
  USING (published = true AND status = 'open');

-- 3. RLS: Candidatura pública em vagas publicadas (sem autenticação)
CREATE POLICY "Public can apply to published jobs"
  ON public.applications FOR INSERT
  WITH CHECK (
    job_id IN (SELECT id FROM public.jobs WHERE published = true AND status = 'open')
  );
