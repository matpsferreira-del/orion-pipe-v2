-- Add parent_company_id for holding/group hierarchy
ALTER TABLE public.companies 
ADD COLUMN parent_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Index for efficient hierarchy queries
CREATE INDEX idx_companies_parent ON public.companies(parent_company_id);