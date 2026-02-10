-- Fix lead update policy: allow any user in the organization to update leads they can see
DROP POLICY IF EXISTS "Users, admins, and assigned agents can update leads" ON public.leads;

CREATE POLICY "Users in organization can update leads"
ON public.leads
FOR UPDATE
USING (
  user_id IN (
    SELECT p.user_id FROM profiles p
    WHERE p.organization_id IN (
      SELECT p2.organization_id FROM profiles p2 WHERE p2.user_id = auth.uid()
    )
  )
);

-- Fix tasks: allow admins to update/delete tasks in their org (for reassignment and management)
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update tasks in their organization"
ON public.tasks
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

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete tasks in their organization"
ON public.tasks
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