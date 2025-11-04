-- Fix agent phone numbers exposure by restricting SELECT policy
DROP POLICY IF EXISTS "Users can view all agents" ON public.agents;

-- Users can only view their own agent record
CREATE POLICY "Users can view their own agent record"
ON public.agents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);