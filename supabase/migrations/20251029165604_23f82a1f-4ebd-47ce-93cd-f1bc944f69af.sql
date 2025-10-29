-- Add pipeline field to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS pipeline TEXT DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_pipeline ON public.leads(pipeline);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);