-- Drop the restrictive policy
DROP POLICY IF EXISTS "Role-based lead visibility" ON public.leads;

-- Restore the original policy - all authenticated users can see all leads
CREATE POLICY "All users can view all leads"
ON public.leads
FOR SELECT
USING (true);