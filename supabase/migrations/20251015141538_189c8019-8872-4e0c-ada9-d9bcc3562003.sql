-- Add new lead information fields
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS down_payment text,
ADD COLUMN IF NOT EXISTS financing_type text,
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS marital_status text,
ADD COLUMN IF NOT EXISTS current_address text,
ADD COLUMN IF NOT EXISTS lead_temperature text DEFAULT 'warm',
ADD COLUMN IF NOT EXISTS language_preference text DEFAULT 'English',
ADD COLUMN IF NOT EXISTS spouse_email text,
ADD COLUMN IF NOT EXISTS preferred_contact_method text DEFAULT 'phone',
ADD COLUMN IF NOT EXISTS social_status text;