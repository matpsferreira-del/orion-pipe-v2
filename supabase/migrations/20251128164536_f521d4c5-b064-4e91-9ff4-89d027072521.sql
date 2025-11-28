-- Drop existing restrictive policies and recreate as permissive

-- Activities table
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can delete activities" ON public.activities;

CREATE POLICY "Authenticated users can view activities" 
ON public.activities FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert activities" 
ON public.activities FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update activities" 
ON public.activities FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete activities" 
ON public.activities FOR DELETE 
TO authenticated
USING (true);

-- Companies table
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON public.companies;

CREATE POLICY "Authenticated users can view companies" 
ON public.companies FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert companies" 
ON public.companies FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update companies" 
ON public.companies FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete companies" 
ON public.companies FOR DELETE 
TO authenticated
USING (true);

-- Contacts table
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.contacts;

CREATE POLICY "Authenticated users can view contacts" 
ON public.contacts FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert contacts" 
ON public.contacts FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts" 
ON public.contacts FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete contacts" 
ON public.contacts FOR DELETE 
TO authenticated
USING (true);

-- Invoices table
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON public.invoices;

CREATE POLICY "Authenticated users can view invoices" 
ON public.invoices FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert invoices" 
ON public.invoices FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices" 
ON public.invoices FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete invoices" 
ON public.invoices FOR DELETE 
TO authenticated
USING (true);

-- Opportunities table
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can delete opportunities" ON public.opportunities;

CREATE POLICY "Authenticated users can view opportunities" 
ON public.opportunities FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert opportunities" 
ON public.opportunities FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update opportunities" 
ON public.opportunities FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete opportunities" 
ON public.opportunities FOR DELETE 
TO authenticated
USING (true);

-- Tasks table
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;

CREATE POLICY "Authenticated users can view tasks" 
ON public.tasks FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert tasks" 
ON public.tasks FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks" 
ON public.tasks FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete tasks" 
ON public.tasks FOR DELETE 
TO authenticated
USING (true);