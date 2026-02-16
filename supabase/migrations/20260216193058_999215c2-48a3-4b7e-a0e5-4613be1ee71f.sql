
-- Fix notify_on_lead_created to include supreme_admin
CREATE OR REPLACE FUNCTION public.notify_on_lead_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  creator_org_id UUID;
  admin_ids UUID[];
  admin_id UUID;
BEGIN
  SELECT organization_id INTO creator_org_id FROM profiles WHERE user_id = NEW.user_id;

  SELECT ARRAY_AGG(ur.user_id) INTO admin_ids
  FROM user_roles ur JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('admin', 'supreme_admin') AND p.organization_id = creator_org_id;

  IF admin_ids IS NOT NULL THEN
    FOREACH admin_id IN ARRAY admin_ids LOOP
      INSERT INTO notifications (user_id, organization_id, type, title, description, link, event_type, entity_type, entity_id, created_by)
      VALUES (
        admin_id, creator_org_id, 'lead_created', 'New Lead Created',
        NEW.name || ' (' || COALESCE(NEW.source, 'Unknown Source') || ') - ' || COALESCE(NEW.phone, 'No phone'),
        '/leads/' || NEW.id, 'lead_created', 'lead', NEW.id, NEW.user_id
      );
    END LOOP;
  END IF;

  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, organization_id, type, title, description, link, event_type, entity_type, entity_id, created_by)
    SELECT p.user_id, creator_org_id, 'lead_assigned', 'New Lead Assigned to You',
      NEW.name || ' (' || COALESCE(NEW.source, 'Unknown Source') || ') has been assigned to you',
      '/leads/' || NEW.id, 'lead_assigned', 'lead', NEW.id, NEW.user_id
    FROM profiles p
    WHERE (p.first_name || ' ' || p.last_name) = NEW.assigned_to AND p.organization_id = creator_org_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix notify_on_task_completed to include supreme_admin
CREATE OR REPLACE FUNCTION public.notify_on_task_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lead_name TEXT;
  completer_name TEXT;
  completer_org_id UUID;
  admin_ids UUID[];
  admin_id UUID;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT name INTO lead_name FROM leads WHERE id = NEW.lead_id;
    SELECT COALESCE(first_name || ' ' || last_name, email), organization_id
    INTO completer_name, completer_org_id FROM profiles WHERE user_id = NEW.user_id;

    SELECT ARRAY_AGG(ur.user_id) INTO admin_ids
    FROM user_roles ur JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.role IN ('admin', 'supreme_admin') AND p.organization_id = completer_org_id AND ur.user_id != NEW.user_id;

    IF admin_ids IS NOT NULL THEN
      FOREACH admin_id IN ARRAY admin_ids LOOP
        INSERT INTO notifications (user_id, organization_id, type, title, description, link, event_type, entity_type, entity_id)
        VALUES (
          admin_id, completer_org_id, 'task_completed', 'Task Completed',
          COALESCE(completer_name, 'Agent') || ' completed "' || NEW.title || '" for ' || COALESCE(lead_name, 'Unknown'),
          '/leads/' || NEW.lead_id, 'task_completed', 'task', NEW.id
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix notify_on_appointment_created to include supreme_admin
CREATE OR REPLACE FUNCTION public.notify_on_appointment_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lead_name TEXT;
  agent_org_id UUID;
  admin_ids UUID[];
  admin_id UUID;
BEGIN
  SELECT name INTO lead_name FROM leads WHERE id = NEW.lead_id;
  SELECT organization_id INTO agent_org_id FROM profiles WHERE user_id = NEW.user_id;

  INSERT INTO notifications (user_id, organization_id, type, title, description, link, event_type, entity_type, entity_id)
  VALUES (
    NEW.user_id, agent_org_id, 'appointment_created', 'New Appointment Scheduled',
    COALESCE(NEW.title, 'Appointment') || ' with ' || COALESCE(lead_name, 'Unknown') || ' on ' || TO_CHAR(NEW.appointment_date::timestamp, 'Mon DD at HH:MI AM'),
    '/calendar', 'appointment_created', 'appointment', NEW.id
  );

  SELECT ARRAY_AGG(ur.user_id) INTO admin_ids
  FROM user_roles ur JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('admin', 'supreme_admin') AND p.organization_id = agent_org_id AND ur.user_id != NEW.user_id;

  IF admin_ids IS NOT NULL THEN
    FOREACH admin_id IN ARRAY admin_ids LOOP
      INSERT INTO notifications (user_id, organization_id, type, title, description, link, event_type, entity_type, entity_id)
      VALUES (
        admin_id, agent_org_id, 'appointment_created', 'New Appointment Scheduled',
        COALESCE(NEW.title, 'Appointment') || ' with ' || COALESCE(lead_name, 'Unknown') || ' on ' || TO_CHAR(NEW.appointment_date::timestamp, 'Mon DD at HH:MI AM'),
        '/calendar', 'appointment_created', 'appointment', NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix notify_admins_wholesale_submission to include supreme_admin
CREATE OR REPLACE FUNCTION public.notify_admins_wholesale_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    SELECT ARRAY_AGG(ur.user_id) INTO admin_ids
    FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.role IN ('admin', 'supreme_admin') AND p.organization_id = owner_org_id;

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
$function$;

-- Fix notify_admin_on_inventory_change to include supreme_admin
CREATE OR REPLACE FUNCTION public.notify_admin_on_inventory_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT ARRAY_AGG(ur.user_id) INTO admin_ids
  FROM user_roles ur
  JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('admin', 'supreme_admin') AND p.organization_id = owner_org_id;

  SELECT ARRAY_AGG(ur.user_id) INTO marketing_ids
  FROM user_roles ur
  JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('marketing', 'marketing_manager') AND p.organization_id = owner_org_id;

  IF admin_ids IS NOT NULL THEN
    FOREACH admin_id IN ARRAY admin_ids
    LOOP
      INSERT INTO notifications (user_id, organization_id, type, title, description, link, user_role, event_type, entity_type, entity_id, created_by)
      VALUES (admin_id, owner_org_id, 'property_update', notification_title, notification_desc, property_link, 'admin', 'property_update', 'property', COALESCE(NEW.id, OLD.id), COALESCE(NEW.user_id, OLD.user_id));
    END LOOP;
  END IF;

  IF marketing_ids IS NOT NULL THEN
    FOREACH marketing_id IN ARRAY marketing_ids
    LOOP
      INSERT INTO notifications (user_id, organization_id, type, title, description, link, user_role, event_type, entity_type, entity_id, created_by)
      VALUES (marketing_id, owner_org_id, 'property_update', notification_title || ' - Marketing Action Needed', notification_desc || '. Please complete marketing checklist and post to socials.', property_link, 'marketing', 'property_update', 'property', COALESCE(NEW.id, OLD.id), COALESCE(NEW.user_id, OLD.user_id));
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
