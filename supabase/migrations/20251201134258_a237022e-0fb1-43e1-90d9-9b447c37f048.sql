-- Add DELETE policy for profiles table (only admins can delete via edge function with service role)
-- First check if policy exists before creating
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Service role can delete profiles'
    ) THEN
        CREATE POLICY "Service role can delete profiles"
        ON public.profiles
        FOR DELETE
        TO service_role
        USING (true);
    END IF;
END $$;