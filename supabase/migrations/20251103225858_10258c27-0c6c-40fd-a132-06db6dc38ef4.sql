-- Add missing fields to leads table for pipeline management
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS spouse_name text,
ADD COLUMN IF NOT EXISTS close_date date,
ADD COLUMN IF NOT EXISTS commission text,
ADD COLUMN IF NOT EXISTS property_of_interest text;