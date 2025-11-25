
-- Add organization-based delete policy for inventory
-- This allows users to delete inventory items created by anyone in their organization

CREATE POLICY "Users can delete inventory in their organization"
ON public.inventory
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles AS user_profile
    WHERE user_profile.user_id = auth.uid()
    AND user_profile.organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.profiles AS item_owner_profile
      WHERE item_owner_profile.user_id = inventory.user_id
      AND item_owner_profile.organization_id = user_profile.organization_id
    )
  )
);
