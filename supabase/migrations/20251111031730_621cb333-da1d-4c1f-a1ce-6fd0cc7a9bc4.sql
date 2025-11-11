-- Add inventory_id column to leads table to link to inventory properties
ALTER TABLE public.leads
ADD COLUMN inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL;