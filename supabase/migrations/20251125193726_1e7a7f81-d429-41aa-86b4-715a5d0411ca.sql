-- Update handle_new_user function to properly handle owner signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  is_owner BOOLEAN;
BEGIN
  -- Check if this is an owner signup by looking at metadata
  is_owner := (NEW.raw_user_meta_data->>'is_owner')::boolean;

  -- Check if user was invited
  SELECT * INTO invitation_record
  FROM public.user_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- User was invited - assign the role from invitation
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_record.role);
  ELSIF is_owner THEN
    -- Owner signup without invitation
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner_user');
  ELSE
    -- New signup (not invited, not owner) - assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$function$;

-- Add cascade delete for owner properties when user is deleted
-- This ensures when an owner account is removed, their properties are also removed
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_user_id_fkey;
-- We don't add a new constraint since user_id in inventory doesn't reference auth.users directly