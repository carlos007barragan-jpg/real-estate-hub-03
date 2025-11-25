-- Drop the overly permissive admin policies
DROP POLICY IF EXISTS "Admins can delete all inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins can update all inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins can insert inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins can view all inventory" ON public.inventory;

-- Create organization-scoped admin policies
CREATE POLICY "Admins can delete inventory in their organization"
ON public.inventory
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') 
  AND EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.user_id = auth.uid() 
    AND p2.user_id = inventory.user_id
    AND p1.organization_id = p2.organization_id
    AND p1.organization_id IS NOT NULL
  )
);

CREATE POLICY "Admins can update inventory in their organization"
ON public.inventory
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') 
  AND EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.user_id = auth.uid() 
    AND p2.user_id = inventory.user_id
    AND p1.organization_id = p2.organization_id
    AND p1.organization_id IS NOT NULL
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.user_id = auth.uid() 
    AND p2.user_id = inventory.user_id
    AND p1.organization_id = p2.organization_id
    AND p1.organization_id IS NOT NULL
  )
);

CREATE POLICY "Admins can insert inventory in their organization"
ON public.inventory
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
  AND user_id = auth.uid()
);

CREATE POLICY "Admins can view inventory in their organization"
ON public.inventory
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') 
  AND EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.user_id = auth.uid() 
    AND p2.user_id = inventory.user_id
    AND p1.organization_id = p2.organization_id
    AND p1.organization_id IS NOT NULL
  )
);