
-- 1. Trigger: Notify on new task creation
CREATE OR REPLACE FUNCTION public.notify_on_task_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lead_name TEXT;
  task_user_org_id UUID;
BEGIN
  SELECT name INTO lead_name FROM leads WHERE id = NEW.lead_id;
  SELECT organization_id INTO task_user_org_id FROM profiles WHERE user_id = NEW.user_id;

  INSERT INTO notifications (user_id, organization_id, type, title, description, link, event_type, entity_type, entity_id)
  VALUES (
    NEW.user_id, task_user_org_id, 'task_created', 'New Task Assigned',
    'Task "' || NEW.title || '" for lead ' || COALESCE(lead_name, 'Unknown') || COALESCE(' - Due: ' || TO_CHAR(NEW.due_date::timestamp, 'Mon DD, YYYY'), ''),
    '/leads/' || NEW.lead_id, 'task_assigned', 'task', NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_task_created
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION notify_on_task_created();

-- 2. Trigger: Notify on appointment creation
CREATE OR REPLACE FUNCTION public.notify_on_appointment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  WHERE ur.role = 'admin' AND p.organization_id = agent_org_id AND ur.user_id != NEW.user_id;

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
$$;

CREATE TRIGGER trigger_notify_appointment_created
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION notify_on_appointment_created();

-- 3. Trigger: Notify admins on new lead creation
CREATE OR REPLACE FUNCTION public.notify_on_lead_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  creator_org_id UUID;
  admin_ids UUID[];
  admin_id UUID;
BEGIN
  SELECT organization_id INTO creator_org_id FROM profiles WHERE user_id = NEW.user_id;

  SELECT ARRAY_AGG(ur.user_id) INTO admin_ids
  FROM user_roles ur JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'admin' AND p.organization_id = creator_org_id;

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
$$;

CREATE TRIGGER trigger_notify_lead_created
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION notify_on_lead_created();

-- 4. Trigger: Notify on task completion
CREATE OR REPLACE FUNCTION public.notify_on_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    WHERE ur.role = 'admin' AND p.organization_id = completer_org_id AND ur.user_id != NEW.user_id;

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
$$;

CREATE TRIGGER trigger_notify_task_completed
AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION notify_on_task_completed();
