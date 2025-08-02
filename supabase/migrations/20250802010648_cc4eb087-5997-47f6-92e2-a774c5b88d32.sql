-- Update RLS policies on profiles table for better security

-- Drop existing policies to recreate them with improved logic
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Policy for SELECT: Users can view their own profile, admins can view all profiles
CREATE POLICY "Users can view their own profile or all if admin"
ON public.profiles
FOR SELECT
USING (
    auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
);

-- Policy for UPDATE: Users can update their own profile, admins can update any profile
CREATE POLICY "Users can update their own profile or all if admin"
ON public.profiles
FOR UPDATE
USING (
    auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
);

-- Policy for DELETE: Only administrators can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (
    has_role(auth.uid(), 'admin'::app_role)
);