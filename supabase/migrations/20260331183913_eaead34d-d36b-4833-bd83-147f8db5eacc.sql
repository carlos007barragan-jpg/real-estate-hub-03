
-- SECURITY FIX 1: Restrict user_roles INSERT to only allow 'agent' role
DROP POLICY IF EXISTS "Users can insert their first role during signup" ON public.user_roles;
CREATE POLICY "Users can insert their first role during signup"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  AND role = 'agent'::app_role
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid())
);

-- SECURITY FIX 2: Fix inventory share_token policy
DROP POLICY IF EXISTS "Public can view properties via share token" ON public.inventory;
CREATE POLICY "Public can view properties via share token"
ON public.inventory
FOR SELECT
TO public
USING (
  share_token IS NOT NULL
  AND share_token = current_setting('request.headers', true)::json->>'x-share-token'
);
