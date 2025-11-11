-- Add completion_notes column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS completion_notes TEXT;