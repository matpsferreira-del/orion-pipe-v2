
CREATE POLICY "Allow anon insert on companies" ON public.companies FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon insert on contacts" ON public.contacts FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon insert on opportunities" ON public.opportunities FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon read profiles" ON public.profiles FOR SELECT USING (true);
