
CREATE OR REPLACE FUNCTION public.notify_admins_property_inquiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_ids UUID[];
  admin_id UUID;
  property_name TEXT;
BEGIN
  SELECT COALESCE(name, 'Unknown Property') INTO property_name
  FROM inventory
  WHERE id = NEW.property_id;

  property_name := COALESCE(property_name, 'Unknown Property');

  SELECT ARRAY_AGG(ur.user_id) INTO admin_ids
  FROM user_roles ur
  JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('admin', 'supreme_admin') AND p.organization_id = NEW.organization_id;

  IF admin_ids IS NOT NULL THEN
    FOREACH admin_id IN ARRAY admin_ids
    LOOP
      INSERT INTO notifications (user_id, organization_id, type, title, description, link, user_role, event_type, entity_type, entity_id, created_by)
      VALUES (
        admin_id,
        NEW.organization_id,
        'property_inquiry',
        'New Property Inquiry',
        COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '') || ' requested showing for ' || property_name ||
          CASE WHEN NEW.preferred_date IS NOT NULL 
            THEN ' on ' || TO_CHAR(NEW.preferred_date, 'Mon DD at HH:MI AM')
            ELSE ''
          END,
        CASE 
          WHEN NEW.lead_id IS NOT NULL THEN '/leads/' || NEW.lead_id::text 
          ELSE '/new-leads' 
        END,
        'admin',
        'property_inquiry',
        'lead',
        COALESCE(NEW.lead_id::text, NEW.id::text),
        NULL
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
