-- Drop the problematic policy that references auth.users
DROP POLICY IF EXISTS "Users can view leads assigned to them" ON public.leads;

-- Create a simpler policy that uses the JWT email directly
CREATE POLICY "Users can view leads assigned to them"
ON public.leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND leads.assigned_to = profiles.first_name || ' ' || profiles.last_name
  )
);