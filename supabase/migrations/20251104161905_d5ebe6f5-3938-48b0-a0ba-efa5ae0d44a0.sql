-- Fix user_roles RLS to allow users to create their first role during signup
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

CREATE POLICY "Users can insert their first role during signup"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    )
  );