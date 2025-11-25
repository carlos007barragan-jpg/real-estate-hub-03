-- Step 2: Add fields and policies for owner portal (fixed trigger)

-- Add type_of_owner to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS type_of_owner TEXT;

-- Add additional fields to inventory for dispo sheets
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS acquisition_price NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_repairs NUMERIC;

-- Create RLS policies for owner_user role
-- Owners can view their own inventory
CREATE POLICY "Owners can view their own inventory"
ON public.inventory
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'owner_user') 
  AND user_id = auth.uid()
);

-- Owners can insert their own inventory
CREATE POLICY "Owners can insert their own inventory"
ON public.inventory
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'owner_user')
  AND user_id = auth.uid()
);

-- Owners can update their own inventory
CREATE POLICY "Owners can update their own inventory"
ON public.inventory
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'owner_user')
  AND user_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'owner_user')
  AND user_id = auth.uid()
);

-- Owners can delete their own inventory
CREATE POLICY "Owners can delete their own inventory"
ON public.inventory
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'owner_user')
  AND user_id = auth.uid()
);

-- Function to notify admin on inventory changes from owner users
CREATE OR REPLACE FUNCTION notify_admin_on_inventory_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_ids UUID[];
  admin_id UUID;
  owner_profile RECORD;
  notification_title TEXT;
  notification_desc TEXT;
  property_link TEXT;
  is_owner BOOLEAN;
BEGIN
  -- Check if the user is an owner
  SELECT has_role(COALESCE(NEW.user_id, OLD.user_id), 'owner_user') INTO is_owner;
  
  -- Only proceed if user is an owner
  IF NOT is_owner THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get owner profile info
  SELECT first_name, last_name, email, phone_number, type_of_owner
  INTO owner_profile
  FROM profiles
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  -- Get all admin user IDs
  SELECT ARRAY_AGG(user_id) INTO admin_ids
  FROM user_roles
  WHERE role = 'admin';

  -- Determine notification content based on operation
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

  -- Send notification to each admin
  IF admin_ids IS NOT NULL THEN
    FOREACH admin_id IN ARRAY admin_ids
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        description,
        link
      ) VALUES (
        admin_id,
        'property_update',
        notification_title,
        notification_desc,
        property_link
      );
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for inventory changes (no WHEN clause)
DROP TRIGGER IF EXISTS inventory_change_notification ON public.inventory;
CREATE TRIGGER inventory_change_notification
AFTER INSERT OR UPDATE OR DELETE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION notify_admin_on_inventory_change();