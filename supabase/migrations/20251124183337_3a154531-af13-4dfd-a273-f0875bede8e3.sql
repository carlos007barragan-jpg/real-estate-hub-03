-- Fix the missing last_modified_by foreign key constraint
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_last_modified_by_fkey,
ADD CONSTRAINT leads_last_modified_by_fkey 
  FOREIGN KEY (last_modified_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;  -- Set to NULL instead of CASCADE to preserve lead history

COMMENT ON CONSTRAINT leads_last_modified_by_fkey ON leads 
IS 'Set last_modified_by to NULL when user is deleted to preserve lead history';