
-- Create follow_up_templates table for org-level template management
CREATE TABLE public.follow_up_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

ALTER TABLE public.follow_up_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates in their organization"
ON public.follow_up_templates FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR organization_id IS NULL
);

CREATE POLICY "Users can create templates"
ON public.follow_up_templates FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can update templates in their organization"
ON public.follow_up_templates FOR UPDATE
USING (
  organization_id = get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can delete templates in their organization"
ON public.follow_up_templates FOR DELETE
USING (
  organization_id = get_user_organization_id(auth.uid())
);
