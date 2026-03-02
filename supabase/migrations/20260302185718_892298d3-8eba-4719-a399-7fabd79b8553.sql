
-- Add property detail fields to lead_deals so each deal can track its own property info
ALTER TABLE public.lead_deals
  ADD COLUMN IF NOT EXISTS property_address text,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS bedrooms integer,
  ADD COLUMN IF NOT EXISTS bathrooms numeric,
  ADD COLUMN IF NOT EXISTS sqft text,
  ADD COLUMN IF NOT EXISTS down_payment text;
