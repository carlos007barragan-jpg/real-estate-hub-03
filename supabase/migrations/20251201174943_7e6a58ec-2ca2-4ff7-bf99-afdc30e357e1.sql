-- Update notify_admins_property_inquiry to include role-based fields
CREATE OR REPLACE FUNCTION public.notify_admins_property_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_ids UUID[];
  admin_id UUID;
  property_name TEXT;
  property_address TEXT;
BEGIN
  SELECT name, name INTO property_name, property_address
  FROM inventory
  WHERE id = NEW.property_id;

  -- Get admin user IDs for this organization only
  SELECT ARRAY_AGG(ur.user_id) INTO admin_ids
  FROM user_roles ur
  JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'admin' AND p.organization_id = NEW.organization_id;

  IF admin_ids IS NOT NULL THEN
    FOREACH admin_id IN ARRAY admin_ids
    LOOP
      INSERT INTO notifications (user_id, organization_id, type, title, description, link, user_role, event_type, entity_type, entity_id, created_by)
      VALUES (
        admin_id,
        NEW.organization_id,
        'property_inquiry',
        'New Property Inquiry',
        NEW.first_name || ' ' || NEW.last_name || ' requested showing for ' || COALESCE(property_name, property_address) || ' on ' || TO_CHAR(NEW.preferred_date, 'Mon DD at HH:MI AM'),
        '/leads',
        'admin',
        'property_inquiry',
        'lead',
        NEW.id,
        NULL
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;