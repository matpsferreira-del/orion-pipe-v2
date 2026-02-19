CREATE POLICY "Public can view companies with published jobs"
  ON public.companies FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT company_id FROM public.jobs 
      WHERE published = true AND status = 'open'
    )
  );