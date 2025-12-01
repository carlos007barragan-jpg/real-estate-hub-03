-- Update notify_admins_wholesale_submission to include role-based fields
CREATE OR REPLACE FUNCTION public.notify_admins_wholesale_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_ids UUID[];
  admin_id UUID;
  owner_name TEXT;
  owner_org_id UUID;
BEGIN
  IF NEW.is_wholesale = true AND TG_OP = 'INSERT' THEN
    SELECT COALESCE(first_name || ' ' || last_name, email), organization_id 
    INTO owner_name, owner_org_id
    FROM profiles
    WHERE user_id = NEW.user_id;

    -- Get admin user IDs for this organization only
    SELECT ARRAY_AGG(ur.user_id) INTO admin_ids
    FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'admin' AND p.organization_id = owner_org_id;

    IF admin_ids IS NOT NULL THEN
      FOREACH admin_id IN ARRAY admin_ids
      LOOP
        INSERT INTO notifications (user_id, organization_id, type, title, description, link, user_role, event_type, entity_type, entity_id, created_by)
        VALUES (
          admin_id,
          owner_org_id,
          'wholesale_submission',
          'New Wholesale Property – Action Needed',
          owner_name || ' submitted wholesale property: ' || NEW.name || ' at $' || COALESCE(NEW.price::TEXT, 'N/A') || '. Perform Market Comps & Identify ARV.',
          '/inventory/' || NEW.id::text,
          'admin',
          'wholesale_submission',
          'property',
          NEW.id,
          NEW.user_id
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;