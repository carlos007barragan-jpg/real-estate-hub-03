-- Add new columns to notifications table for role-based filtering
ALTER TABLE public.notifications 
ADD COLUMN user_role text,
ADD COLUMN event_type text,
ADD COLUMN entity_type text,
ADD COLUMN entity_id uuid,
ADD COLUMN created_by uuid;

-- Create index for efficient role-based queries
CREATE INDEX idx_notifications_role_org ON public.notifications(organization_id, user_role);
CREATE INDEX idx_notifications_entity ON public.notifications(entity_type, entity_id);