
-- Create performance_standards table
CREATE TABLE public.performance_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  category text NOT NULL,
  period text NOT NULL,
  target_value integer NOT NULL,
  label text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, metric_key)
);

-- Enable RLS
ALTER TABLE public.performance_standards ENABLE ROW LEVEL SECURITY;

-- Org members can view
CREATE POLICY "Org members can view performance standards"
ON public.performance_standards
FOR SELECT
TO authenticated
USING (organization_id = get_user_organization_id(auth.uid()));

-- Supreme admins can manage
CREATE POLICY "Supreme admins can insert performance standards"
ON public.performance_standards
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
  AND has_role(auth.uid(), 'supreme_admin'::app_role)
);

CREATE POLICY "Supreme admins can update performance standards"
ON public.performance_standards
FOR UPDATE
TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND has_role(auth.uid(), 'supreme_admin'::app_role)
);

CREATE POLICY "Supreme admins can delete performance standards"
ON public.performance_standards
FOR DELETE
TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND has_role(auth.uid(), 'supreme_admin'::app_role)
);
