-- Ensure all authenticated users can insert call logs
DROP POLICY IF EXISTS "Users can create their own call logs" ON public.call_logs;

CREATE POLICY "All users can create call logs"
ON public.call_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure all authenticated users can update call logs
DROP POLICY IF EXISTS "Users can update their own call logs" ON public.call_logs;

CREATE POLICY "All users can update call logs"
ON public.call_logs
FOR UPDATE
TO authenticated
USING (true);