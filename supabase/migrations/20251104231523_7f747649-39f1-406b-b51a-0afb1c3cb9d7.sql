-- Update leads table - all authenticated users can view all leads
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view leads they created" ON public.leads;
DROP POLICY IF EXISTS "Users can view leads assigned to them" ON public.leads;

CREATE POLICY "All users can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (true);

-- Update tasks table - all authenticated users can view all tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;

CREATE POLICY "All users can view all tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (true);

-- Update notes table - all authenticated users can view all notes
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;

CREATE POLICY "All users can view all notes"
ON public.notes
FOR SELECT
TO authenticated
USING (true);

-- Update documents table - all authenticated users can view all documents
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;

CREATE POLICY "All users can view all documents"
ON public.documents
FOR SELECT
TO authenticated
USING (true);

-- Update call_logs table - all authenticated users can view all call logs
DROP POLICY IF EXISTS "Users can view their own call logs" ON public.call_logs;

CREATE POLICY "All users can view all call logs"
ON public.call_logs
FOR SELECT
TO authenticated
USING (true);

-- Update sms_logs table - all authenticated users can view all SMS logs
DROP POLICY IF EXISTS "Users can view their own SMS logs" ON public.sms_logs;

CREATE POLICY "All users can view all SMS logs"
ON public.sms_logs
FOR SELECT
TO authenticated
USING (true);

-- Update custom_fields table - all authenticated users can view all custom fields
DROP POLICY IF EXISTS "Users can view their own custom fields" ON public.custom_fields;

CREATE POLICY "All users can view all custom fields"
ON public.custom_fields
FOR SELECT
TO authenticated
USING (true);

-- Update crm_settings table - all authenticated users can view all settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.crm_settings;

CREATE POLICY "All users can view all settings"
ON public.crm_settings
FOR SELECT
TO authenticated
USING (true);

-- Update agents table - all authenticated users can view all agents
DROP POLICY IF EXISTS "Users can view their own agent record" ON public.agents;

CREATE POLICY "All users can view all agents"
ON public.agents
FOR SELECT
TO authenticated
USING (true);