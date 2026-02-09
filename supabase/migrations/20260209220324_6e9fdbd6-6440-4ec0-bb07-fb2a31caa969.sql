
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_invitation_record RECORD;
  owner_invitation_record RECORD;
  is_owner BOOLEAN;
  inviter_org_id UUID;
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

    -- Create profile linked to the invitation's organization
    INSERT INTO public.profiles (user_id, email, first_name, last_name, organization_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      user_invitation_record.organization_id
    )
    ON CONFLICT (user_id) DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      email = EXCLUDED.email;

    -- Mark invitation as accepted
    UPDATE public.user_invitations
    SET status = 'accepted'
    WHERE id = user_invitation_record.id;

  ELSIF owner_invitation_record IS NOT NULL THEN
    -- User was invited as owner - assign owner_user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner_user')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Get the inviter's organization
    SELECT organization_id INTO inviter_org_id
    FROM public.profiles
    WHERE user_id = owner_invitation_record.invited_by
    LIMIT 1;

    -- Create profile linked to inviter's organization
    INSERT INTO public.profiles (user_id, email, first_name, last_name, organization_id, type_of_owner)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(owner_invitation_record.name, NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      inviter_org_id,
      owner_invitation_record.type_of_owner
    )
    ON CONFLICT (user_id) DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      email = EXCLUDED.email,
      type_of_owner = EXCLUDED.type_of_owner;

    -- Mark owner invitation as accepted
    UPDATE public.owner_invitations
    SET status = 'accepted'
    WHERE id = owner_invitation_record.id;

  ELSIF is_owner THEN
    -- Owner signup without invitation
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner_user')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.profiles (user_id, email, first_name, last_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )
    ON CONFLICT (user_id) DO NOTHING;

  ELSE
    -- New signup (not invited, not owner) - assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.profiles (user_id, email, first_name, last_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
