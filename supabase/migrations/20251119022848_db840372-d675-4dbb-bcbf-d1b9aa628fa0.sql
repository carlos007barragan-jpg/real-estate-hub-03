-- Fix data exposure by restricting SELECT policies to user's own data
-- This migration addresses the PUBLIC_DATA_EXPOSURE security issue

-- ===== CONTACTS =====
DROP POLICY IF EXISTS "Users can view all contacts" ON public.contacts;

CREATE POLICY "Users can view their own contacts"
ON public.contacts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contacts"
ON public.contacts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== SMS_LOGS =====
DROP POLICY IF EXISTS "All users can view all SMS logs" ON public.sms_logs;

CREATE POLICY "Users can view their own SMS logs"
ON public.sms_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all SMS logs"
ON public.sms_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== CALL_LOGS =====
DROP POLICY IF EXISTS "All users can view all call logs" ON public.call_logs;

CREATE POLICY "Users can view their own call logs"
ON public.call_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all call logs"
ON public.call_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== DOCUMENTS =====
DROP POLICY IF EXISTS "All users can view all documents" ON public.documents;

CREATE POLICY "Users can view their own documents"
ON public.documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents"
ON public.documents FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== TASKS =====
DROP POLICY IF EXISTS "All users can view all tasks" ON public.tasks;

CREATE POLICY "Users can view their own tasks"
ON public.tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tasks"
ON public.tasks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== NOTES =====
DROP POLICY IF EXISTS "All users can view all notes" ON public.notes;

CREATE POLICY "Users can view their own notes"
ON public.notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notes"
ON public.notes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== APPOINTMENTS =====
DROP POLICY IF EXISTS "Users can view all appointments" ON public.appointments;

CREATE POLICY "Users can view their own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all appointments"
ON public.appointments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== CRM_SETTINGS =====
DROP POLICY IF EXISTS "All users can view all settings" ON public.crm_settings;

CREATE POLICY "Users can view their own settings"
ON public.crm_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all settings"
ON public.crm_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== CUSTOM_FIELDS =====
DROP POLICY IF EXISTS "All users can view all custom fields" ON public.custom_fields;

CREATE POLICY "Users can view their own custom fields"
ON public.custom_fields FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all custom fields"
ON public.custom_fields FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== TRANSACTION_TYPES =====
DROP POLICY IF EXISTS "All users can view all transaction types" ON public.transaction_types;

CREATE POLICY "Users can view their own transaction types"
ON public.transaction_types FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transaction types"
ON public.transaction_types FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== INVENTORY =====
DROP POLICY IF EXISTS "Users can view all inventory" ON public.inventory;

CREATE POLICY "Users can view their own inventory"
ON public.inventory FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all inventory"
ON public.inventory FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== AGENTS =====
-- Keep agents visible to all for agent directory functionality
-- This is acceptable as it only contains phone numbers for internal team

-- ===== SELLERS =====
DROP POLICY IF EXISTS "Users can view all sellers" ON public.sellers;

CREATE POLICY "Users can view their own sellers"
ON public.sellers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sellers"
ON public.sellers FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== INVENTORY_FIELD_OPTIONS =====
DROP POLICY IF EXISTS "All users can view all field options" ON public.inventory_field_options;

CREATE POLICY "Users can view their own field options"
ON public.inventory_field_options FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all field options"
ON public.inventory_field_options FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));