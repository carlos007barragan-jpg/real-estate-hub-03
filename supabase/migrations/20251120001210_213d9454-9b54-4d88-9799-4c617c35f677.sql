-- Update handle_new_user to NOT automatically create profiles
-- Let the CompleteProfile page handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Check if user was invited
  SELECT * INTO invitation_record
  FROM public.user_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- User was invited - only assign role, don't create profile yet
    -- Profile will be created when they complete the profile form
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_record.role);

    -- Don't mark invitation as accepted yet - wait for profile completion
  ELSE
    -- New signup (not invited) - only assign admin role
    -- Don't create organization or profile yet - let CompleteProfile handle it
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;