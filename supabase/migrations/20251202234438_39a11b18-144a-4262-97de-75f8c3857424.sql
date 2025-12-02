
-- Drop existing restrictive policies for pipelines
DROP POLICY IF EXISTS "Admins can create pipelines in their organization" ON public.pipelines;
DROP POLICY IF EXISTS "Admins can update pipelines in their organization" ON public.pipelines;
DROP POLICY IF EXISTS "Admins can delete pipelines in their organization" ON public.pipelines;

-- Create new policies that allow all organization users to manage pipelines
CREATE POLICY "Users can create pipelines in their organization" 
ON public.pipelines 
FOR INSERT 
TO authenticated
WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update pipelines in their organization" 
ON public.pipelines 
FOR UPDATE 
TO authenticated
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can delete pipelines in their organization" 
ON public.pipelines 
FOR DELETE 
TO authenticated
USING (organization_id = get_user_organization_id(auth.uid()));
