-- Create user_company_access junction table for multi-tenant access control
CREATE TABLE public.user_company_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    access_level text NOT NULL DEFAULT 'member' CHECK (access_level IN ('owner', 'admin', 'member', 'readonly')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, company_id)
);

-- Enable RLS on the new table
ALTER TABLE public.user_company_access ENABLE ROW LEVEL SECURITY;

-- Users can view their own company access records
CREATE POLICY "Users can view own company access"
    ON public.user_company_access FOR SELECT
    USING (user_id = auth.uid());

-- Admins and gestors can manage company access
CREATE POLICY "Admins can manage company access"
    ON public.user_company_access FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- Create security definer function to check company access
CREATE OR REPLACE FUNCTION public.has_company_access(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_company_access
        WHERE user_id = _user_id
        AND company_id = _company_id
    ) OR EXISTS (
        -- Admins have access to all companies
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = 'admin'::app_role
    )
$$;

-- Create function to get user's accessible company IDs
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- If user is admin, return all company IDs
    SELECT id FROM public.companies
    WHERE EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role = 'admin'::app_role
    )
    UNION
    -- Otherwise return only companies they have access to
    SELECT company_id FROM public.user_company_access
    WHERE user_id = _user_id
    AND NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role = 'admin'::app_role
    )
$$;

-- Drop existing permissive SELECT policies and replace with company-scoped ones

-- COMPANIES table
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
CREATE POLICY "Users can view companies they have access to"
    ON public.companies FOR SELECT
    USING (
        has_role(auth.uid(), 'admin'::app_role) 
        OR id IN (SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid())
    );

-- CONTACTS table
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
CREATE POLICY "Users can view contacts from accessible companies"
    ON public.contacts FOR SELECT
    USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR company_id IN (SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid())
    );

-- Update INSERT policy to scope to accessible companies
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON public.contacts;
CREATE POLICY "Users can insert contacts for accessible companies"
    ON public.contacts FOR INSERT
    WITH CHECK (
        has_role(auth.uid(), 'admin'::app_role)
        OR company_id IN (SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid())
    );

-- Update UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
CREATE POLICY "Users can update contacts from accessible companies"
    ON public.contacts FOR UPDATE
    USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR company_id IN (SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid())
    );

-- OPPORTUNITIES table
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON public.opportunities;
CREATE POLICY "Users can view opportunities from accessible companies"
    ON public.opportunities FOR SELECT
    USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR company_id IN (SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid())
    );

-- Update INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert opportunities" ON public.opportunities;
CREATE POLICY "Users can insert opportunities for accessible companies"
    ON public.opportunities FOR INSERT
    WITH CHECK (
        has_role(auth.uid(), 'admin'::app_role)
        OR company_id IN (SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid())
    );

-- ACTIVITIES table
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;
CREATE POLICY "Users can view activities from accessible companies"
    ON public.activities FOR SELECT
    USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR company_id IN (SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid())
    );

-- TASKS table
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
CREATE POLICY "Users can view tasks from accessible companies or assigned to them"
    ON public.tasks FOR SELECT
    USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR responsavel_id = get_user_profile_id(auth.uid())
        OR user_id = get_user_profile_id(auth.uid())
        OR (company_id IS NOT NULL AND company_id IN (SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid()))
    );

-- INVOICES table
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
CREATE POLICY "Users can view invoices from accessible companies"
    ON public.invoices FOR SELECT
    USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR company_id IN (SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid())
    );

-- Migrate existing data: Grant access to users based on existing responsavel_id relationships
INSERT INTO public.user_company_access (user_id, company_id, access_level)
SELECT DISTINCT p.user_id, c.id, 'owner'
FROM public.companies c
JOIN public.profiles p ON p.id = c.responsavel_id
WHERE p.user_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Also grant access based on opportunity responsibilities
INSERT INTO public.user_company_access (user_id, company_id, access_level)
SELECT DISTINCT p.user_id, o.company_id, 'member'
FROM public.opportunities o
JOIN public.profiles p ON p.id = o.responsavel_id
WHERE p.user_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Grant access based on activity ownership
INSERT INTO public.user_company_access (user_id, company_id, access_level)
SELECT DISTINCT p.user_id, a.company_id, 'member'
FROM public.activities a
JOIN public.profiles p ON p.id = a.user_id
WHERE p.user_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Grant access based on task assignments
INSERT INTO public.user_company_access (user_id, company_id, access_level)
SELECT DISTINCT p.user_id, t.company_id, 'member'
FROM public.tasks t
JOIN public.profiles p ON p.id = t.responsavel_id
WHERE t.company_id IS NOT NULL AND p.user_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;