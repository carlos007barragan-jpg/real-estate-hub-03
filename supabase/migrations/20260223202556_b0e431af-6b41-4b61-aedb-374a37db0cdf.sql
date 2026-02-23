
DROP POLICY "Users can create their own tasks" ON public.tasks;

CREATE POLICY "Users can create tasks in their organization"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR
  (
    user_id IN (
      SELECT p.user_id FROM profiles p
      WHERE p.organization_id = get_user_organization_id(auth.uid())
    )
  )
);
