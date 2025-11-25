-- Add DELETE policies for admin to remove owner accounts

-- Allow admins to delete owner invitations
CREATE POLICY "Admins can delete owner invitations"
ON owner_invitations
FOR DELETE
USING (has_role(auth.uid(), 'admin') AND invited_by = auth.uid());

-- Allow admins to delete profiles in their organization
CREATE POLICY "Admins can delete profiles in their organization"
ON profiles
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') 
  AND organization_id = get_user_organization_id(auth.uid())
);

-- Allow admins to delete owner profiles (owners don't have organization_id)
CREATE POLICY "Admins can delete owner profiles"
ON profiles
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') 
  AND type_of_owner IS NOT NULL
);