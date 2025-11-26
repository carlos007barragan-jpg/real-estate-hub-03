-- Add organization branding settings
CREATE TABLE IF NOT EXISTS public.organization_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#666666',
  public_page_title TEXT DEFAULT 'Properties',
  public_page_description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage organization branding"
ON public.organization_branding
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND organization_id = get_user_organization_id(auth.uid())
);

CREATE POLICY "Public can view organization branding"
ON public.organization_branding
FOR SELECT
USING (true);

-- Add public visibility controls to inventory
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS show_on_public_page BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_approval_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS admin_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_reviewed_by UUID REFERENCES auth.users(id);

-- Add showing/inquiry tracking
CREATE TABLE IF NOT EXISTS public.property_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  preferred_date TIMESTAMPTZ,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  organization_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.property_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization users can view their inquiries"
ON public.property_inquiries
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
);

CREATE POLICY "Public can create inquiries"
ON public.property_inquiries
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update inquiry status"
ON public.property_inquiries
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND organization_id = get_user_organization_id(auth.uid())
);

-- Add field visibility settings
CREATE TABLE IF NOT EXISTS public.public_field_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, field_name)
);

ALTER TABLE public.public_field_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage field settings"
ON public.public_field_settings
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND organization_id = get_user_organization_id(auth.uid())
);

CREATE POLICY "Public can view field settings"
ON public.public_field_settings
FOR SELECT
USING (true);

-- Create function to notify admins of new property inquiry
CREATE OR REPLACE FUNCTION public.notify_admins_property_inquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_ids UUID[];
  admin_id UUID;
  property_name TEXT;
  property_address TEXT;
BEGIN
  -- Get property details
  SELECT name, property_address INTO property_name, property_address
  FROM inventory
  WHERE id = NEW.property_id;

  -- Get all admin user IDs for the organization
  SELECT ARRAY_AGG(user_id) INTO admin_ids
  FROM user_roles
  WHERE role = 'admin'
  AND user_id IN (
    SELECT user_id FROM profiles WHERE organization_id = NEW.organization_id
  );

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
        'property_inquiry',
        'New Property Inquiry',
        NEW.first_name || ' ' || NEW.last_name || ' requested showing for ' || COALESCE(property_name, property_address) || ' on ' || TO_CHAR(NEW.preferred_date, 'Mon DD at HH:MI AM'),
        '/leads'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_admins_on_property_inquiry
AFTER INSERT ON public.property_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_property_inquiry();