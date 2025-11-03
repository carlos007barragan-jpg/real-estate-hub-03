-- Add is_demo_data column to relevant tables
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_demo_data boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_demo_data boolean DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_demo_data boolean DEFAULT false;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS is_demo_data boolean DEFAULT false;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS is_demo_data boolean DEFAULT false;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_demo_data boolean DEFAULT false;

-- Add index for better performance when filtering demo data
CREATE INDEX IF NOT EXISTS idx_leads_is_demo_data ON public.leads(is_demo_data);
CREATE INDEX IF NOT EXISTS idx_tasks_is_demo_data ON public.tasks(is_demo_data);
CREATE INDEX IF NOT EXISTS idx_notes_is_demo_data ON public.notes(is_demo_data);
CREATE INDEX IF NOT EXISTS idx_call_logs_is_demo_data ON public.call_logs(is_demo_data);
CREATE INDEX IF NOT EXISTS idx_sms_logs_is_demo_data ON public.sms_logs(is_demo_data);