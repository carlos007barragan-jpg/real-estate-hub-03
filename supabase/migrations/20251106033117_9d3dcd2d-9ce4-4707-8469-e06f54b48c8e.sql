-- Add foreign key constraint from appointments to leads
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_lead_id_fkey 
FOREIGN KEY (lead_id) 
REFERENCES public.leads(id) 
ON DELETE CASCADE;