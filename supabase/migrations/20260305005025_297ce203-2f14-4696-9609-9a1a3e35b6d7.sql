
-- COMPANIES
DROP POLICY IF EXISTS "Users can update companies they are responsible for" ON public.companies;
CREATE POLICY "Authenticated users can update companies" ON public.companies FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Only admins can delete companies" ON public.companies;
CREATE POLICY "Authenticated users can delete companies" ON public.companies FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- CONTACTS
DROP POLICY IF EXISTS "Users can insert contacts for accessible companies" ON public.contacts;
CREATE POLICY "Authenticated users can insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can update contacts from accessible companies" ON public.contacts;
CREATE POLICY "Authenticated users can update contacts" ON public.contacts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Only admins and gestors can delete contacts" ON public.contacts;
CREATE POLICY "Authenticated users can delete contacts" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- OPPORTUNITIES
DROP POLICY IF EXISTS "Users can update opportunities they are responsible for" ON public.opportunities;
CREATE POLICY "Authenticated users can update opportunities" ON public.opportunities FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Only admins can delete opportunities" ON public.opportunities;
CREATE POLICY "Authenticated users can delete opportunities" ON public.opportunities FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ACTIVITIES
DROP POLICY IF EXISTS "Users can insert own activities" ON public.activities;
CREATE POLICY "Authenticated users can insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can update own activities" ON public.activities;
CREATE POLICY "Authenticated users can update activities" ON public.activities FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can delete own activities" ON public.activities;
CREATE POLICY "Authenticated users can delete activities" ON public.activities FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- TASKS
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Authenticated users can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- JOBS
DROP POLICY IF EXISTS "Users can update jobs they are responsible for" ON public.jobs;
CREATE POLICY "Authenticated users can update jobs" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Only admins can delete jobs" ON public.jobs;
CREATE POLICY "Authenticated users can delete jobs" ON public.jobs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- APPLICATIONS
DROP POLICY IF EXISTS "Users can update applications for accessible jobs" ON public.applications;
CREATE POLICY "Authenticated users can update applications" ON public.applications FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Only admins can delete applications" ON public.applications;
CREATE POLICY "Authenticated users can delete applications" ON public.applications FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- JOB_PIPELINE_STAGES
DROP POLICY IF EXISTS "Users can manage stages for jobs they manage" ON public.job_pipeline_stages;
CREATE POLICY "Authenticated users can manage pipeline stages" ON public.job_pipeline_stages FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- PARTY
DROP POLICY IF EXISTS "Only admins can delete parties" ON public.party;
CREATE POLICY "Authenticated users can delete parties" ON public.party FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
