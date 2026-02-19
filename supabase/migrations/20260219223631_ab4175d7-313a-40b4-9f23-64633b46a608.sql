
-- Drop existing restrictive update/delete policies
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;

-- Recreate with org-level access for admins
CREATE POLICY "Users can update appointments in their organization"
ON public.appointments
FOR UPDATE
USING (
  auth.uid() = user_id
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id IN (
      SELECT p.user_id FROM profiles p
      WHERE p.organization_id IN (
        SELECT p2.organization_id FROM profiles p2 WHERE p2.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete appointments in their organization"
ON public.appointments
FOR DELETE
USING (
  auth.uid() = user_id
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id IN (
      SELECT p.user_id FROM profiles p
      WHERE p.organization_id IN (
        SELECT p2.organization_id FROM profiles p2 WHERE p2.user_id = auth.uid()
      )
    )
  )
);
