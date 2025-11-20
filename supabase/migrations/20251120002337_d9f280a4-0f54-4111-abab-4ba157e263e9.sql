-- Fix the circular dependency in organizations RLS policy
-- Users should be able to see organizations they created, even before their profile exists

DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;

CREATE POLICY "Users can view their own organization" 
ON public.organizations 
FOR SELECT 
USING (
  -- Allow viewing if user created the organization
  created_by = auth.uid()
  OR
  -- OR if user has a profile in this organization
  id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);