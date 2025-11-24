-- Fix foreign key constraints to allow cascade deletion of users

-- Update profiles table to cascade delete
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey,
ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Update user_roles table to cascade delete
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Update leads table to cascade delete (or set null if you want to keep leads)
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_user_id_fkey,
ADD CONSTRAINT leads_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Update other tables that reference users
ALTER TABLE contacts
DROP CONSTRAINT IF EXISTS contacts_user_id_fkey,
ADD CONSTRAINT contacts_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE agents
DROP CONSTRAINT IF EXISTS agents_user_id_fkey,
ADD CONSTRAINT agents_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT profiles_user_id_fkey ON profiles 
IS 'Cascade delete profile when user is deleted';
COMMENT ON CONSTRAINT user_roles_user_id_fkey ON user_roles 
IS 'Cascade delete roles when user is deleted';
COMMENT ON CONSTRAINT leads_user_id_fkey ON leads 
IS 'Cascade delete leads when user is deleted';
COMMENT ON CONSTRAINT contacts_user_id_fkey ON contacts 
IS 'Cascade delete contacts when user is deleted';
COMMENT ON CONSTRAINT agents_user_id_fkey ON agents 
IS 'Cascade delete agent record when user is deleted';