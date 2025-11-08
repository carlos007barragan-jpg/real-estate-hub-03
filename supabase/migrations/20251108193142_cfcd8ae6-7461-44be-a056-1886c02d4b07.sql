-- Add down_payment column to inventory table
ALTER TABLE public.inventory
ADD COLUMN down_payment numeric;

-- Add comment explaining the field
COMMENT ON COLUMN public.inventory.down_payment IS 'Down payment amount for owner-financed properties';