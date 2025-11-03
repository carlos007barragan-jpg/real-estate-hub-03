-- Add title_office field to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS title_office text;