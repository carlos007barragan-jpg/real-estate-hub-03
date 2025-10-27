-- Add fallback phone numbers to crm_settings
ALTER TABLE public.crm_settings 
ADD COLUMN fallback_phone_1 text,
ADD COLUMN fallback_phone_2 text;