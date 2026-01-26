-- Fix overly permissive RLS policies

-- 1. Fix user_invitations: System update should be service role only (triggered by auth)
DROP POLICY IF EXISTS "System can update invitations" ON public.user_invitations;
CREATE POLICY "Service role can update invitations"
ON public.user_invitations FOR UPDATE
USING (auth.role() = 'service_role');

-- 2. Fix owner_invitations: System update should be service role only
DROP POLICY IF EXISTS "System can update invitations" ON public.owner_invitations;
CREATE POLICY "Service role can update invitations"
ON public.owner_invitations FOR UPDATE
USING (auth.role() = 'service_role');

-- 3. Fix call_logs: Only authenticated users should create/update call logs
DROP POLICY IF EXISTS "All users can create call logs" ON public.call_logs;
CREATE POLICY "Authenticated users can create call logs"
ON public.call_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "All users can update call logs" ON public.call_logs;
CREATE POLICY "Users can update call logs in their organization"
ON public.call_logs FOR UPDATE
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin')
);

-- 4. Fix property_inquiries: Public can still create but with validation
DROP POLICY IF EXISTS "Public can create inquiries" ON public.property_inquiries;
CREATE POLICY "Anyone can create property inquiries"
ON public.property_inquiries FOR INSERT
WITH CHECK (
  -- Ensure the property exists and organization_id matches the property's organization
  organization_id IN (
    SELECT p.organization_id 
    FROM profiles p 
    JOIN inventory i ON i.user_id = p.user_id 
    WHERE i.id = property_id
  )
);

-- 5. Fix notifications: Only service role or authenticated users can create
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Service role can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);