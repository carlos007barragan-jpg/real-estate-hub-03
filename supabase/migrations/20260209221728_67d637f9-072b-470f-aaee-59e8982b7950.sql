-- Allow admins to update profiles in their organization (e.g., to remove a team member)
CREATE POLICY "Admins can update profiles in their organization"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND organization_id = get_user_organization_id(auth.uid())
);