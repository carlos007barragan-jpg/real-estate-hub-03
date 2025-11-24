-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;

-- Create a new policy that allows users to delete their own leads OR admins to delete any leads in their organization
CREATE POLICY "Users can delete their own leads or admins can delete organization leads"
ON leads
FOR DELETE
USING (
  auth.uid() = user_id 
  OR 
  (
    has_role(auth.uid(), 'admin'::app_role) 
    AND user_id IN (
      SELECT profiles.user_id
      FROM profiles
      WHERE profiles.organization_id IN (
        SELECT profiles_1.organization_id
        FROM profiles profiles_1
        WHERE profiles_1.user_id = auth.uid()
      )
    )
  )
);