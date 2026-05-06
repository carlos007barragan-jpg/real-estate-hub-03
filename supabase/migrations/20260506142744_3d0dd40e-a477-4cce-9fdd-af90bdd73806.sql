
-- 1. pipeline_access table
CREATE TABLE public.pipeline_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  granted_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, pipeline_id)
);

CREATE INDEX idx_pipeline_access_user ON public.pipeline_access(user_id);
CREATE INDEX idx_pipeline_access_pipeline ON public.pipeline_access(pipeline_id);

ALTER TABLE public.pipeline_access ENABLE ROW LEVEL SECURITY;

-- Agents see their own grants
CREATE POLICY "Users can view their own pipeline access"
  ON public.pipeline_access FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all grants in their org
CREATE POLICY "Admins can view org pipeline access"
  ON public.pipeline_access FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND organization_id = get_user_organization_id(auth.uid())
  );

CREATE POLICY "Admins can grant pipeline access"
  ON public.pipeline_access FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND organization_id = get_user_organization_id(auth.uid())
  );

CREATE POLICY "Admins can revoke pipeline access"
  ON public.pipeline_access FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND organization_id = get_user_organization_id(auth.uid())
  );

-- 2. Helper: returns true if user can see leads in given pipeline name
CREATE OR REPLACE FUNCTION public.user_can_access_pipeline(_user_id uuid, _pipeline_name text, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins & supreme admins always have access
    has_role(_user_id, 'admin'::app_role)
    OR (
      _pipeline_name IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.pipeline_access pa
        JOIN public.pipelines p ON p.id = pa.pipeline_id
        WHERE pa.user_id = _user_id
          AND pa.organization_id = _org_id
          AND p.name = _pipeline_name
      )
    )
$$;

-- 3. Update leads SELECT RLS to gate by pipeline access
DROP POLICY IF EXISTS "Users can view leads in their organization" ON public.leads;

CREATE POLICY "Users can view leads in their organization"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    -- Same org
    user_id IN (
      SELECT profiles.user_id
      FROM profiles
      WHERE profiles.organization_id IN (
        SELECT p2.organization_id FROM profiles p2 WHERE p2.user_id = auth.uid()
      )
    )
    AND (
      -- Admins see everything
      has_role(auth.uid(), 'admin'::app_role)
      -- Owner of the lead always sees it
      OR auth.uid() = leads.user_id
      -- Otherwise pipeline must be accessible
      OR public.user_can_access_pipeline(
        auth.uid(),
        leads.pipeline,
        get_user_organization_id(auth.uid())
      )
    )
  );
