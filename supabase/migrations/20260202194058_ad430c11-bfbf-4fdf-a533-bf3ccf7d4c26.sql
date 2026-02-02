-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'consultor');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing roles (authenticated users can see roles)
CREATE POLICY "Authenticated users can view roles" ON public.user_roles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Create policy for admins to manage roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'::app_role
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'::app_role
        )
    );

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Create function to get user profile id from auth uid
CREATE OR REPLACE FUNCTION public.get_user_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Drop existing permissive policies for activities
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can delete activities" ON public.activities;

-- Create new restrictive policies for activities
CREATE POLICY "Users can insert own activities" ON public.activities
    FOR INSERT
    WITH CHECK (user_id = public.get_user_profile_id(auth.uid()));

CREATE POLICY "Users can update own activities" ON public.activities
    FOR UPDATE
    USING (user_id = public.get_user_profile_id(auth.uid()));

CREATE POLICY "Users can delete own activities" ON public.activities
    FOR DELETE
    USING (user_id = public.get_user_profile_id(auth.uid()));

-- Drop existing permissive policies for tasks
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;

-- Create new restrictive policies for tasks
CREATE POLICY "Users can insert tasks" ON public.tasks
    FOR INSERT
    WITH CHECK (
        user_id = public.get_user_profile_id(auth.uid()) OR
        responsavel_id = public.get_user_profile_id(auth.uid())
    );

CREATE POLICY "Users can update assigned tasks" ON public.tasks
    FOR UPDATE
    USING (
        user_id = public.get_user_profile_id(auth.uid()) OR
        responsavel_id = public.get_user_profile_id(auth.uid())
    );

CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE
    USING (user_id = public.get_user_profile_id(auth.uid()));

-- Drop existing permissive policies for companies
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON public.companies;

-- Create new restrictive policies for companies
CREATE POLICY "Authenticated users can insert companies" ON public.companies
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update companies they are responsible for" ON public.companies
    FOR UPDATE
    USING (
        responsavel_id = public.get_user_profile_id(auth.uid()) OR
        public.has_role(auth.uid(), 'admin'::app_role) OR
        public.has_role(auth.uid(), 'gestor'::app_role)
    );

CREATE POLICY "Only admins can delete companies" ON public.companies
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop existing permissive policies for contacts
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.contacts;

-- Create new restrictive policies for contacts
CREATE POLICY "Authenticated users can insert contacts" ON public.contacts
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update contacts" ON public.contacts
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins and gestors can delete contacts" ON public.contacts
    FOR DELETE
    USING (
        public.has_role(auth.uid(), 'admin'::app_role) OR
        public.has_role(auth.uid(), 'gestor'::app_role)
    );

-- Drop existing permissive policies for opportunities
DROP POLICY IF EXISTS "Authenticated users can insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can delete opportunities" ON public.opportunities;

-- Create new restrictive policies for opportunities
CREATE POLICY "Authenticated users can insert opportunities" ON public.opportunities
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update opportunities they are responsible for" ON public.opportunities
    FOR UPDATE
    USING (
        responsavel_id = public.get_user_profile_id(auth.uid()) OR
        public.has_role(auth.uid(), 'admin'::app_role) OR
        public.has_role(auth.uid(), 'gestor'::app_role)
    );

CREATE POLICY "Only admins can delete opportunities" ON public.opportunities
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop existing permissive policies for invoices
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON public.invoices;

-- Create new restrictive policies for invoices
CREATE POLICY "Only admins and gestors can insert invoices" ON public.invoices
    FOR INSERT
    WITH CHECK (
        public.has_role(auth.uid(), 'admin'::app_role) OR
        public.has_role(auth.uid(), 'gestor'::app_role)
    );

CREATE POLICY "Only admins and gestors can update invoices" ON public.invoices
    FOR UPDATE
    USING (
        public.has_role(auth.uid(), 'admin'::app_role) OR
        public.has_role(auth.uid(), 'gestor'::app_role)
    );

CREATE POLICY "Only admins can delete invoices" ON public.invoices
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 
    CASE 
        WHEN p.role = 'admin' THEN 'admin'::app_role
        WHEN p.role = 'gestor' THEN 'gestor'::app_role
        ELSE 'consultor'::app_role
    END
FROM public.profiles p
ON CONFLICT (user_id, role) DO NOTHING;

-- Update handle_new_user function to also create role entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'consultor'
  );
  
  -- Also insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'consultor'::app_role);
  
  RETURN NEW;
END;
$function$;