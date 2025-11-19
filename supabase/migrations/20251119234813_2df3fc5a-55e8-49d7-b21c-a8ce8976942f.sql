-- Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Update existing profiles with emails from auth.users
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.user_id = au.id
AND p.email IS NULL;

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
DECLARE
  invitation_record RECORD;
  new_org_id UUID;
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
    -- User was invited - use invitation's organization and role
    INSERT INTO public.profiles (id, user_id, first_name, last_name, email, organization_id)
    VALUES (
      gen_random_uuid(),
      NEW.id,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.email,
      invitation_record.organization_id
    );

    -- Assign role from invitation
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_record.role);

    -- Mark invitation as accepted
    UPDATE public.user_invitations
    SET status = 'accepted'
    WHERE id = invitation_record.id;
  ELSE
    -- New signup (not invited) - create organization and assign admin role
    INSERT INTO public.organizations (name, created_by)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.email || '''s Organization'),
      NEW.id
    )
    RETURNING id INTO new_org_id;

    -- Create profile with new organization
    INSERT INTO public.profiles (id, user_id, first_name, last_name, email, organization_id)
    VALUES (
      gen_random_uuid(),
      NEW.id,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.email,
      new_org_id
    );

    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;