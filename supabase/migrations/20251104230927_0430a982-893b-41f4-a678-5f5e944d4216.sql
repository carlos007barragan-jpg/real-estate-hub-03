-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads;

-- Create new policies for better lead visibility
-- Admins can see all leads
CREATE POLICY "Admins can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
);

-- Users can see leads they created
CREATE POLICY "Users can view leads they created"
ON public.leads
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- Users can see leads assigned to them (if assigned_to matches their profile)
CREATE POLICY "Users can view leads assigned to them"
ON public.leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (
      leads.assigned_to = profiles.first_name || ' ' || profiles.last_name
      OR leads.assigned_to = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);