-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update handle_new_user function to check both invitation tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_invitation_record RECORD;
  owner_invitation_record RECORD;
  is_owner BOOLEAN;
BEGIN
  -- Check if this is an owner signup by looking at metadata
  is_owner := COALESCE((NEW.raw_user_meta_data->>'is_owner')::boolean, false);

  -- Check if user was invited via user_invitations (team member invites)
  SELECT * INTO user_invitation_record
  FROM public.user_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if user was invited via owner_invitations (owner invites)
  SELECT * INTO owner_invitation_record
  FROM public.owner_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- Priority: user_invitations > owner_invitations > metadata is_owner
  IF user_invitation_record IS NOT NULL THEN
    -- User was invited as team member - assign the role from invitation
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_invitation_record.role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF owner_invitation_record IS NOT NULL THEN
    -- User was invited as owner - assign owner_user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner_user')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF is_owner THEN
    -- Owner signup without invitation (metadata indicates owner)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner_user')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- New signup (not invited, not owner) - assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix the current user's role (leonelherr9827@gmail.com) from agent to owner_user
DELETE FROM user_roles 
WHERE user_id = 'f98e8567-6c96-40fe-ad01-3b82891b4e43' AND role = 'agent';

INSERT INTO user_roles (user_id, role)
VALUES ('f98e8567-6c96-40fe-ad01-3b82891b4e43', 'owner_user')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update the owner invitation status to accepted
UPDATE owner_invitations 
SET status = 'accepted'
WHERE email = 'leonelherr9827@gmail.com' 
  AND status = 'pending';