-- Add foreign key constraint from leads.user_id to profiles.user_id
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_user_id_fkey;

ALTER TABLE public.leads
ADD CONSTRAINT leads_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;