
-- Add funding-specific fields to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS points_charged TEXT,
  ADD COLUMN IF NOT EXISTS total_fee TEXT;

-- Add funding-specific fields to lead_deals
ALTER TABLE public.lead_deals
  ADD COLUMN IF NOT EXISTS points_charged TEXT,
  ADD COLUMN IF NOT EXISTS total_fee TEXT;
