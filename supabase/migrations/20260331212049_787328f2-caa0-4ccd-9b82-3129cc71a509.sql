CREATE POLICY "Users can view call logs in their organization"
ON public.call_logs FOR SELECT
TO authenticated
USING (
  get_user_organization_id(auth.uid()) = get_user_organization_id(user_id)
);