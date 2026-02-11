-- Create a security definer function to upsert profile atomically
CREATE OR REPLACE FUNCTION public.complete_user_profile(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone_number text,
  p_email text,
  p_organization_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Only allow users to complete their own profile
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Upsert the profile
  INSERT INTO public.profiles (user_id, first_name, last_name, phone_number, email, organization_id)
  VALUES (p_user_id, p_first_name, p_last_name, p_phone_number, p_email, p_organization_id)
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id),
    updated_at = now()
  RETURNING row_to_json(profiles.*) INTO v_result;

  RETURN v_result;
END;
$$;