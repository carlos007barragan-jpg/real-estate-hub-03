-- Drop existing foreign key constraints that block user deletion and recreate with ON DELETE SET NULL

-- Fix inventory foreign keys that reference profiles/users
ALTER TABLE public.inventory 
DROP CONSTRAINT IF EXISTS inventory_admin_reviewed_by_fkey;

ALTER TABLE public.inventory
ADD CONSTRAINT inventory_admin_reviewed_by_fkey 
FOREIGN KEY (admin_reviewed_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Also fix assigned_agent_id and claimed_by_admin_id if they have similar issues
ALTER TABLE public.inventory 
DROP CONSTRAINT IF EXISTS inventory_assigned_agent_id_fkey;

ALTER TABLE public.inventory
ADD CONSTRAINT inventory_assigned_agent_id_fkey 
FOREIGN KEY (assigned_agent_id) 
REFERENCES public.profiles(user_id) 
ON DELETE SET NULL;

ALTER TABLE public.inventory 
DROP CONSTRAINT IF EXISTS inventory_claimed_by_admin_id_fkey;

ALTER TABLE public.inventory
ADD CONSTRAINT inventory_claimed_by_admin_id_fkey 
FOREIGN KEY (claimed_by_admin_id) 
REFERENCES public.profiles(user_id) 
ON DELETE SET NULL;