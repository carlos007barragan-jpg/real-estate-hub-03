-- Fix security issue: Remove public access from profiles table
-- Drop existing problematic policy if it exists
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Ensure organization-scoped access is the only SELECT policy
-- (The "Users can view profiles in their organization" policy should already exist,
-- but we'll recreate it to be certain)
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

CREATE POLICY "Users can view profiles in their organization"
ON public.profiles FOR SELECT
USING (
  organization_id IN (
    SELECT p.organization_id 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);

-- Fix security issue: Remove public access from owner_invitations table
-- Only allow viewing by token through a secure edge function instead
DROP POLICY IF EXISTS "Users can view invitation by token" ON public.owner_invitations;

-- Keep only the admin-scoped policy for viewing invitations
-- (The "Admins can view their invitations" policy should already exist)