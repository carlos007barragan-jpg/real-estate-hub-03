
-- ============================================
-- WORKFLOW AUTOMATION ENGINE
-- ============================================

-- 1. Workflows table: defines reusable workflow templates (Supreme Admin configures)
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual',  -- 'new_lead', 'pipeline_stage', 'manual'
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"pipeline_id":"...", "stage_name":"Under Contract"}
  steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{action_type, day_offset, title, description}]
  stop_condition TEXT NOT NULL DEFAULT 'assigned_to_pipeline', -- 'assigned_to_pipeline', 'never'
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflows in their organization"
ON public.workflows FOR SELECT
USING (organization_id = get_user_organization_id(auth.uid()) OR organization_id IS NULL);

CREATE POLICY "Supreme admins can manage workflows"
ON public.workflows FOR ALL
USING (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'));

-- 2. Workflow instances: tracks an active run of a workflow for a specific lead
CREATE TABLE public.workflow_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- the agent assigned
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'stopped'
  current_step INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow instances in their org"
ON public.workflow_instances FOR SELECT
USING (get_user_organization_id(auth.uid()) = get_user_organization_id(user_id));

CREATE POLICY "Users can update workflow instances in their org"
ON public.workflow_instances FOR UPDATE
USING (get_user_organization_id(auth.uid()) = get_user_organization_id(user_id));

CREATE POLICY "System can create workflow instances"
ON public.workflow_instances FOR INSERT
WITH CHECK (get_user_organization_id(auth.uid()) = get_user_organization_id(user_id));

-- 3. Add workflow_instance_id to follow_ups to link steps to instances
ALTER TABLE public.follow_ups ADD COLUMN workflow_instance_id UUID REFERENCES public.workflow_instances(id) ON DELETE CASCADE;

-- 4. Indexes
CREATE INDEX idx_workflows_org_trigger ON public.workflows(organization_id, trigger_type);
CREATE INDEX idx_workflow_instances_lead ON public.workflow_instances(lead_id, status);
CREATE INDEX idx_follow_ups_instance ON public.follow_ups(workflow_instance_id);

-- 5. Function: Start a workflow for a lead (called by triggers or manually)
CREATE OR REPLACE FUNCTION public.start_workflow_for_lead(
  p_workflow_id UUID,
  p_lead_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance_id UUID;
  v_steps JSONB;
  v_step JSONB;
  v_index INTEGER := 0;
  v_scheduled_date TIMESTAMPTZ;
BEGIN
  -- Get workflow steps
  SELECT steps INTO v_steps FROM workflows WHERE id = p_workflow_id AND is_active = true;
  IF v_steps IS NULL THEN RETURN NULL; END IF;

  -- Create workflow instance
  INSERT INTO workflow_instances (workflow_id, lead_id, user_id, status)
  VALUES (p_workflow_id, p_lead_id, p_user_id)
  RETURNING id INTO v_instance_id;

  -- Create follow_up entries for each step
  FOR v_step IN SELECT * FROM jsonb_array_elements(v_steps)
  LOOP
    v_scheduled_date := now() + ((v_step->>'day_offset')::integer || ' days')::interval;
    
    INSERT INTO follow_ups (
      lead_id, user_id, action_type, scheduled_date, status,
      notes, sequence_order, workflow_instance_id
    ) VALUES (
      p_lead_id, p_user_id,
      COALESCE(v_step->>'action_type', 'task'),
      v_scheduled_date,
      'pending',
      COALESCE(v_step->>'title', 'Workflow step'),
      v_index,
      v_instance_id
    );
    v_index := v_index + 1;
  END LOOP;

  RETURN v_instance_id;
END;
$$;

-- 6. Trigger function: Auto-start workflows when a new lead is created
CREATE OR REPLACE FUNCTION public.trigger_new_lead_workflows()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_workflow RECORD;
  v_assigned_user UUID;
BEGIN
  -- Get organization
  v_org_id := get_user_organization_id(NEW.user_id);
  
  -- Determine assigned user (use assigned agent or lead creator)
  IF NEW.assigned_to IS NOT NULL THEN
    SELECT p.user_id INTO v_assigned_user
    FROM profiles p
    WHERE (p.first_name || ' ' || p.last_name) = NEW.assigned_to
      AND p.organization_id = v_org_id
    LIMIT 1;
  END IF;
  v_assigned_user := COALESCE(v_assigned_user, NEW.user_id);

  -- Find and start all active new_lead workflows for this org
  FOR v_workflow IN
    SELECT id FROM workflows
    WHERE organization_id = v_org_id
      AND trigger_type = 'new_lead'
      AND is_active = true
  LOOP
    PERFORM start_workflow_for_lead(v_workflow.id, NEW.id, v_assigned_user);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_created_start_workflows
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.trigger_new_lead_workflows();

-- 7. Trigger function: Handle pipeline stage changes
CREATE OR REPLACE FUNCTION public.trigger_pipeline_stage_workflows()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_workflow RECORD;
  v_assigned_user UUID;
BEGIN
  -- Only fire on pipeline or stage changes
  IF OLD.pipeline IS NOT DISTINCT FROM NEW.pipeline 
     AND OLD.pipeline_stage IS NOT DISTINCT FROM NEW.pipeline_stage THEN
    RETURN NEW;
  END IF;

  v_org_id := get_user_organization_id(NEW.user_id);

  -- If lead just got assigned to a pipeline, stop any active "new_lead" workflow instances
  IF OLD.pipeline IS NULL AND NEW.pipeline IS NOT NULL THEN
    UPDATE workflow_instances wi
    SET status = 'stopped', completed_at = now()
    FROM workflows w
    WHERE wi.workflow_id = w.id
      AND wi.lead_id = NEW.id
      AND wi.status = 'active'
      AND w.stop_condition = 'assigned_to_pipeline';
    
    -- Also mark remaining pending follow_ups as skipped
    UPDATE follow_ups fu
    SET status = 'skipped'
    FROM workflow_instances wi, workflows w
    WHERE fu.workflow_instance_id = wi.id
      AND wi.workflow_id = w.id
      AND wi.lead_id = NEW.id
      AND wi.status = 'stopped'
      AND fu.status = 'pending'
      AND w.stop_condition = 'assigned_to_pipeline';
  END IF;

  -- Check for pipeline_stage trigger workflows
  IF NEW.pipeline IS NOT NULL AND NEW.pipeline_stage IS NOT NULL THEN
    -- Get assigned user
    IF NEW.assigned_to IS NOT NULL THEN
      SELECT p.user_id INTO v_assigned_user
      FROM profiles p
      WHERE (p.first_name || ' ' || p.last_name) = NEW.assigned_to
        AND p.organization_id = v_org_id
      LIMIT 1;
    END IF;
    v_assigned_user := COALESCE(v_assigned_user, NEW.user_id);

    FOR v_workflow IN
      SELECT id FROM workflows
      WHERE organization_id = v_org_id
        AND trigger_type = 'pipeline_stage'
        AND is_active = true
        AND trigger_config->>'stage_name' = NEW.pipeline_stage
        AND (
          trigger_config->>'pipeline_name' IS NULL 
          OR trigger_config->>'pipeline_name' = NEW.pipeline
        )
    LOOP
      -- Don't start duplicate instances
      IF NOT EXISTS (
        SELECT 1 FROM workflow_instances
        WHERE workflow_id = v_workflow.id AND lead_id = NEW.id AND status = 'active'
      ) THEN
        PERFORM start_workflow_for_lead(v_workflow.id, NEW.id, v_assigned_user);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_pipeline_change_workflows
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.trigger_pipeline_stage_workflows();
