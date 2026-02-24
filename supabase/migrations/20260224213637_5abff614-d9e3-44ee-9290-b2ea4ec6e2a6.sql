
-- Allow anon role to insert into automation_triggers
CREATE POLICY "Allow anon inserts into automation_triggers"
ON public.automation_triggers FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon role to read automation_triggers
CREATE POLICY "Allow anon select on automation_triggers"
ON public.automation_triggers FOR SELECT
TO anon
USING (true);

-- Grant table permissions to anon role
GRANT INSERT ON public.automation_triggers TO anon;
GRANT SELECT ON public.automation_triggers TO anon;
