-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "All users can view all leads" ON public.leads;

-- Create new granular SELECT policy
CREATE POLICY "Role-based lead visibility"
ON public.leads
FOR SELECT
USING (
  -- Admins and marketing managers can see all leads
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'marketing_manager'::app_role)
  -- Agents can see leads assigned to them (matched by phone number)
  OR EXISTS (
    SELECT 1
    FROM agents a
    WHERE a.user_id = auth.uid()
      AND a.phone_number IS NOT NULL
      AND a.phone_number = leads.agent_phone
  )
  -- Agents can also see unassigned leads (no transaction type or "Unassigned")
  OR (
    EXISTS (
      SELECT 1
      FROM agents a
      WHERE a.user_id = auth.uid()
    )
    AND (leads.lead_temperature IS NULL OR leads.lead_temperature = 'Unassigned')
  )
  -- Users can always see their own created leads
  OR auth.uid() = leads.user_id
);