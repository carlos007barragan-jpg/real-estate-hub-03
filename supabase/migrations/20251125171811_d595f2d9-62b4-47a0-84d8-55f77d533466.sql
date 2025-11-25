-- Add admin insert policy for inventory
CREATE POLICY "Admins can insert inventory"
ON public.inventory
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
);

-- Add admin update policy for inventory
CREATE POLICY "Admins can update all inventory"
ON public.inventory
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add admin delete policy for inventory
CREATE POLICY "Admins can delete all inventory"
ON public.inventory
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));