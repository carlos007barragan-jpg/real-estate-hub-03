-- Drop the restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;

-- Create new organization-scoped SELECT policy for tasks
CREATE POLICY "Users can view tasks in their organization"
ON public.tasks
FOR SELECT
USING (
  user_id IN (
    SELECT p.user_id 
    FROM profiles p 
    WHERE p.organization_id IN (
      SELECT p2.organization_id 
      FROM profiles p2 
      WHERE p2.user_id = auth.uid()
    )
  )
);