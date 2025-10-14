-- Add new fields to leads table for better lead management
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS timeframe text,
ADD COLUMN IF NOT EXISTS spouse_phone text,
ADD COLUMN IF NOT EXISTS lead_lifecycle text DEFAULT 'Contact' NOT NULL;

-- Create a comment to document the lead lifecycle stages
COMMENT ON COLUMN public.leads.lead_lifecycle IS 'Lead lifecycle stages: Contact, Book Consult, Execute Consult, Showings, Moved to Pipeline';

-- The pipeline_stage will be used once the lead lifecycle is complete and they move to an actual pipeline