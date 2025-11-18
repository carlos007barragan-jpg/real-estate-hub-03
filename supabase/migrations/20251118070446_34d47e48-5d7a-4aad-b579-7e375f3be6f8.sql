-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add organization_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Update handle_new_user function to handle organizations and invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  new_org_id UUID;
BEGIN
  -- Check if user was invited
  SELECT * INTO invitation_record
  FROM public.user_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- User was invited - use invitation's organization and role
    INSERT INTO public.profiles (id, user_id, first_name, last_name, organization_id)
    VALUES (
      gen_random_uuid(),
      NEW.id,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      invitation_record.organization_id
    );

    -- Assign role from invitation
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_record.role);

    -- Mark invitation as accepted
    UPDATE public.user_invitations
    SET status = 'accepted'
    WHERE id = invitation_record.id;
  ELSE
    -- New signup (not invited) - create organization and assign admin role
    INSERT INTO public.organizations (name, created_by)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.email || '''s Organization'),
      NEW.id
    )
    RETURNING id INTO new_org_id;

    -- Create profile with new organization
    INSERT INTO public.profiles (id, user_id, first_name, last_name, organization_id)
    VALUES (
      gen_random_uuid(),
      NEW.id,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      new_org_id
    );

    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organizations"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for user_invitations
CREATE POLICY "Admins can view invitations in their organization"
  ON public.user_invitations
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') AND
    organization_id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create invitations"
  ON public.user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    invited_by = auth.uid() AND
    organization_id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can update invitations"
  ON public.user_invitations
  FOR UPDATE
  TO authenticated
  USING (true);

-- Update profiles RLS to be organization-scoped
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

-- Update leads RLS to be organization-scoped
DROP POLICY IF EXISTS "All users can view all leads" ON public.leads;

CREATE POLICY "Users can view leads in their organization"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT user_id
      FROM public.profiles
      WHERE organization_id IN (
        SELECT organization_id
        FROM public.profiles
        WHERE user_id = auth.uid()
      )
    )
  );