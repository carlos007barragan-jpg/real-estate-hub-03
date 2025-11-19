-- Fix infinite recursion in profiles RLS policy
-- Create a security definer function to safely get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id(p_user_id UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM profiles 
  WHERE user_id = p_user_id 
  LIMIT 1;
$$;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;

-- Create a new non-recursive policy using the security definer function
CREATE POLICY "Users can view profiles in their organization"
ON profiles FOR SELECT
USING (
  auth.uid() = user_id 
  OR organization_id = public.get_user_organization_id(auth.uid())
);