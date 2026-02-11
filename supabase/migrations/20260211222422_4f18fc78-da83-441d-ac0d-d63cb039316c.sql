
-- Create a security definer function for admins to remove users from their organization
CREATE OR REPLACE FUNCTION public.remove_user_from_organization(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_org_id uuid;
  v_target_org_id uuid;
BEGIN
  -- Verify caller is an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized: must be admin';
  END IF;

  -- Get admin's organization
  SELECT organization_id INTO v_admin_org_id FROM profiles WHERE user_id = auth.uid();
  
  -- Get target user's organization
  SELECT organization_id INTO v_target_org_id FROM profiles WHERE user_id = p_target_user_id;
  
  -- Verify same organization
  IF v_admin_org_id IS NULL OR v_admin_org_id != v_target_org_id THEN
    RAISE EXCEPTION 'Not authorized: user not in your organization';
  END IF;

  -- Prevent self-removal
  IF auth.uid() = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot remove yourself';
  END IF;

  -- Clear organization
  UPDATE profiles SET organization_id = NULL WHERE user_id = p_target_user_id;
  
  -- Delete role
  DELETE FROM user_roles WHERE user_id = p_target_user_id;
END;
$$;
