-- Add foreign key constraint from agents.user_id to profiles.user_id
ALTER TABLE public.agents 
DROP CONSTRAINT IF EXISTS agents_user_id_fkey;

ALTER TABLE public.agents
ADD CONSTRAINT agents_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;