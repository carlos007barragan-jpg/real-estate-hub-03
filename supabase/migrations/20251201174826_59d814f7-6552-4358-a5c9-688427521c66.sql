-- Update notify_admin_on_inventory_change to include role-based fields
CREATE OR REPLACE FUNCTION public.notify_admin_on_inventory_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_ids UUID[];
  marketing_ids UUID[];
  admin_id UUID;
  marketing_id UUID;
  owner_profile RECORD;
  owner_org_id UUID;
  notification_title TEXT;
  notification_desc TEXT;
  property_link TEXT;
  is_owner BOOLEAN;
BEGIN
  SELECT has_role(COALESCE(NEW.user_id, OLD.user_id), 'owner_user') INTO is_owner;
  
  IF NOT is_owner THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT first_name, last_name, email, phone_number, type_of_owner, organization_id
  INTO owner_profile
  FROM profiles
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  owner_org_id := owner_profile.organization_id;

  IF TG_OP = 'INSERT' THEN
    notification_title := 'New Property Added';
    notification_desc := COALESCE(owner_profile.first_name || ' ' || owner_profile.last_name, 'Owner') || ' added property: ' || NEW.name || ' at $' || COALESCE(NEW.price::TEXT, 'N/A');
    property_link := '/inventory';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      notification_title := 'Property Status Changed';
      notification_desc := 'Property ' || NEW.name || ' status changed to: ' || NEW.status;
    ELSE
      notification_title := 'Property Updated';
      notification_desc := COALESCE(owner_profile.first_name || ' ' || owner_profile.last_name, 'Owner') || ' updated property: ' || NEW.name;
    END IF;
    property_link := '/inventory';
  ELSIF TG_OP = 'DELETE' THEN
    notification_title := 'Property Removed';
    notification_desc := COALESCE(owner_profile.first_name || ' ' || owner_profile.last_name, 'Owner') || ' removed property: ' || OLD.name;
    property_link := '/inventory';
  END IF;

  -- Get admin user IDs for this organization
  SELECT ARRAY_AGG(ur.user_id) INTO admin_ids
  FROM user_roles ur
  JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'admin' AND p.organization_id = owner_org_id;

  -- Get marketing user IDs for this organization
  SELECT ARRAY_AGG(ur.user_id) INTO marketing_ids
  FROM user_roles ur
  JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('marketing', 'marketing_manager') AND p.organization_id = owner_org_id;

  -- Notify admins
  IF admin_ids IS NOT NULL THEN
    FOREACH admin_id IN ARRAY admin_ids
    LOOP
      INSERT INTO notifications (user_id, organization_id, type, title, description, link, user_role, event_type, entity_type, entity_id, created_by)
      VALUES (admin_id, owner_org_id, 'property_update', notification_title, notification_desc, property_link, 'admin', 'property_update', 'property', COALESCE(NEW.id, OLD.id), COALESCE(NEW.user_id, OLD.user_id));
    END LOOP;
  END IF;

  -- Notify marketing team
  IF marketing_ids IS NOT NULL THEN
    FOREACH marketing_id IN ARRAY marketing_ids
    LOOP
      INSERT INTO notifications (user_id, organization_id, type, title, description, link, user_role, event_type, entity_type, entity_id, created_by)
      VALUES (marketing_id, owner_org_id, 'property_update', notification_title || ' - Marketing Action Needed', notification_desc || '. Please complete marketing checklist and post to socials.', property_link, 'marketing', 'property_update', 'property', COALESCE(NEW.id, OLD.id), COALESCE(NEW.user_id, OLD.user_id));
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;