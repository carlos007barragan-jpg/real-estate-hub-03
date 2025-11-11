-- Add last_modified_by column to leads table
ALTER TABLE public.leads
ADD COLUMN last_modified_by uuid REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX idx_leads_last_modified_by ON public.leads(last_modified_by);

-- Add comment for documentation
COMMENT ON COLUMN public.leads.last_modified_by IS 'Tracks the user who made the most recent modification to this lead';