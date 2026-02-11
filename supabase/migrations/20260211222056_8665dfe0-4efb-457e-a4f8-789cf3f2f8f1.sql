
-- Drop and recreate the admin update policy to allow setting organization_id to null
DROP POLICY "Admins can update profiles in their organization" ON public.profiles;

CREATE POLICY "Admins can update profiles in their organization"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND organization_id = get_user_organization_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    organization_id = get_user_organization_id(auth.uid())
    OR organization_id IS NULL
  )
);
