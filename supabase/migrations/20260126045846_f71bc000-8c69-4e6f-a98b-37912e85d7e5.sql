-- Fix infinite recursion in profiles SELECT policy
-- Use the security definer function instead of subquery
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

CREATE POLICY "Users can view profiles in their organization"
ON public.profiles FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
);