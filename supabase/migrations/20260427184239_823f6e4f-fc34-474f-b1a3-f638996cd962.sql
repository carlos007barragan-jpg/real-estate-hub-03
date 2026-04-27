
-- 1. Move John Porco into the correct organization (Real Living)
UPDATE public.profiles
SET organization_id = 'd14cb9dc-7218-4632-a3fb-1e74ca50d6fd'
WHERE user_id = 'e5080490-e8bd-4ae2-ac9e-5fbba7f429de';

-- 2. Delete the orphan organization that was auto-created for him
DELETE FROM public.profiles
WHERE organization_id = '6ad8c7d1-5a74-42cf-9b4a-95b6f6a86207'
  AND user_id != 'e5080490-e8bd-4ae2-ac9e-5fbba7f429de';

-- 3. Patch complete_user_profile so it never overwrites an existing org_id.
-- This is the root cause: invited users had their invitation-assigned org
-- replaced when they completed their profile.
CREATE OR REPLACE FUNCTION public.complete_user_profile(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone_number text,
  p_email text,
  p_organization_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_existing_org uuid;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Preserve any existing organization_id (e.g. set by invitation flow)
  SELECT organization_id INTO v_existing_org
  FROM public.profiles WHERE user_id = p_user_id;

  INSERT INTO public.profiles (user_id, first_name, last_name, phone_number, email, organization_id)
  VALUES (
    p_user_id, p_first_name, p_last_name, p_phone_number, p_email,
    COALESCE(v_existing_org, p_organization_id)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    organization_id = COALESCE(profiles.organization_id, EXCLUDED.organization_id),
    updated_at = now()
  RETURNING row_to_json(profiles.*) INTO v_result;

  RETURN v_result;
END;
$function$;
