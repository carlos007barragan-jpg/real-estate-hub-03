CREATE POLICY "Org members can view inventory in their organization"
ON public.inventory
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles viewer, public.profiles owner
    WHERE viewer.user_id = auth.uid()
      AND owner.user_id = inventory.user_id
      AND viewer.organization_id = owner.organization_id
      AND viewer.organization_id IS NOT NULL
  )
);