-- Drop existing restrictive policy that only allows creators to update
DROP POLICY IF EXISTS "Users can update their own leads" ON public.leads;

-- Create new comprehensive policy: users can update leads if they created them, OR they're admins, OR they're the assigned agent
CREATE POLICY "Users, admins, and assigned agents can update leads"
ON public.leads
FOR UPDATE
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.user_id = auth.uid()
      AND a.phone_number IS NOT NULL
      AND a.phone_number = public.leads.agent_phone
  )
);