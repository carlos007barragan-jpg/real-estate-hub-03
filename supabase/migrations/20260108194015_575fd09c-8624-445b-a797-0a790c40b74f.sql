-- Add organization_id column to contacts table
ALTER TABLE public.contacts ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Populate organization_id from user's profile
UPDATE public.contacts c
SET organization_id = (
  SELECT p.organization_id FROM profiles p WHERE p.user_id = c.user_id
);

-- Drop old user-scoped RLS policies
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can create their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can view all contacts" ON public.contacts;

-- Create organization-scoped RLS policies
CREATE POLICY "Users can view contacts in their organization"
ON public.contacts FOR SELECT
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can create contacts in their organization"
ON public.contacts FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND organization_id = get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can update contacts in their organization"
ON public.contacts FOR UPDATE
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can delete contacts in their organization"
ON public.contacts FOR DELETE
USING (organization_id = get_user_organization_id(auth.uid()));