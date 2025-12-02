-- Create pipelines table to store custom pipelines per organization
CREATE TABLE public.pipelines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id),
  name text NOT NULL,
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- Users can view pipelines in their organization
CREATE POLICY "Users can view pipelines in their organization"
ON public.pipelines
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
);

-- Admins can create pipelines in their organization
CREATE POLICY "Admins can create pipelines in their organization"
ON public.pipelines
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND
  organization_id = get_user_organization_id(auth.uid())
);

-- Admins can update pipelines in their organization
CREATE POLICY "Admins can update pipelines in their organization"
ON public.pipelines
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  organization_id = get_user_organization_id(auth.uid())
);

-- Admins can delete pipelines in their organization
CREATE POLICY "Admins can delete pipelines in their organization"
ON public.pipelines
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  organization_id = get_user_organization_id(auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_pipelines_updated_at
BEFORE UPDATE ON public.pipelines
FOR EACH ROW
EXECUTE FUNCTION public.update_leads_updated_at();