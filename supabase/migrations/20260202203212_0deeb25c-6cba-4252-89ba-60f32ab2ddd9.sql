-- Create a public profiles view with limited data (excluding sensitive fields)
CREATE VIEW public.public_profiles AS
SELECT id, name, avatar, role
FROM public.profiles;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a new restrictive policy - users can only view their own full profile
CREATE POLICY "Users can view own profile only"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Admins and gestors can view all profiles for team management
CREATE POLICY "Admins and gestors can view all profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role)
);