-- Allow any authenticated user to delete demo inventory items
-- This does not affect non-demo items which remain protected by ownership policy
CREATE POLICY "Users can delete demo inventory"
ON public.inventory
FOR DELETE
TO authenticated
USING (is_demo_data = true);