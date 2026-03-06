
-- COMPANIES: allow all authenticated users to view all companies
DROP POLICY IF EXISTS "Users can view companies they have access to" ON public.companies;
CREATE POLICY "Authenticated users can view all companies" ON public.companies
  FOR SELECT TO authenticated USING (true);

-- CONTACTS: allow all authenticated users to view all contacts
DROP POLICY IF EXISTS "Users can view contacts from accessible companies" ON public.contacts;
CREATE POLICY "Authenticated users can view all contacts" ON public.contacts
  FOR SELECT TO authenticated USING (true);

-- OPPORTUNITIES: allow all authenticated users to view all opportunities
DROP POLICY IF EXISTS "Users can view opportunities from accessible companies" ON public.opportunities;
CREATE POLICY "Authenticated users can view all opportunities" ON public.opportunities
  FOR SELECT TO authenticated USING (true);

-- ACTIVITIES: allow all authenticated users to view all activities
DROP POLICY IF EXISTS "Users can view activities from accessible companies" ON public.activities;
CREATE POLICY "Authenticated users can view all activities" ON public.activities
  FOR SELECT TO authenticated USING (true);

-- TASKS: allow all authenticated users to view all tasks
DROP POLICY IF EXISTS "Users can view tasks from accessible companies or assigned to t" ON public.tasks;
CREATE POLICY "Authenticated users can view all tasks" ON public.tasks
  FOR SELECT TO authenticated USING (true);

-- INVOICES: allow all authenticated users to view all invoices
DROP POLICY IF EXISTS "Users can view invoices from accessible companies" ON public.invoices;
CREATE POLICY "Authenticated users can view all invoices" ON public.invoices
  FOR SELECT TO authenticated USING (true);

-- JOBS: allow all authenticated users to view all jobs
DROP POLICY IF EXISTS "Users can view jobs from accessible companies" ON public.jobs;
CREATE POLICY "Authenticated users can view all jobs" ON public.jobs
  FOR SELECT TO authenticated USING (true);

-- JOBS INSERT: allow all authenticated users to create jobs
DROP POLICY IF EXISTS "Users can insert jobs for accessible companies" ON public.jobs;
CREATE POLICY "Authenticated users can insert jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- OPPORTUNITIES INSERT: allow all authenticated users to create opportunities
DROP POLICY IF EXISTS "Users can insert opportunities for accessible companies" ON public.opportunities;
CREATE POLICY "Authenticated users can insert opportunities" ON public.opportunities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
