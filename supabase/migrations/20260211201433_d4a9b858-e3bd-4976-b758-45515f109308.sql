-- Allow users to always SELECT their own profile (needed for profile completion flow)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Also fix Jose's missing role
INSERT INTO public.user_roles (user_id, role)
VALUES ('32c56417-3179-465d-812c-a81ac7d4f20c', 'agent')
ON CONFLICT DO NOTHING;