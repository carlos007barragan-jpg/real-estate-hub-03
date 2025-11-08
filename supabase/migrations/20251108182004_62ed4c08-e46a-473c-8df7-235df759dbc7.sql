-- Add new fields to inventory table for property tracking
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS arv numeric,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'available',
ADD COLUMN IF NOT EXISTS sqft numeric,
ADD COLUMN IF NOT EXISTS bedrooms integer,
ADD COLUMN IF NOT EXISTS bathrooms numeric,
ADD COLUMN IF NOT EXISTS commission numeric,
ADD COLUMN IF NOT EXISTS property_type text;

-- Remove google_sheet_row_id as it's no longer needed
ALTER TABLE public.inventory
DROP COLUMN IF EXISTS google_sheet_row_id;

-- Add index for faster searches by category and status
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_property_type ON public.inventory(property_type);