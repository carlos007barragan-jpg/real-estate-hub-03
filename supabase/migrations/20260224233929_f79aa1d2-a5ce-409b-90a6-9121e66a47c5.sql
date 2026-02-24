
-- Create task_assignees junction table for multi-assignee support
CREATE TABLE public.task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint to prevent duplicate assignments
ALTER TABLE public.task_assignees ADD CONSTRAINT task_assignees_unique UNIQUE (task_id, user_id);

-- Enable RLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS policies based on organization membership (same pattern as tasks)
CREATE POLICY "Users can view task assignees in their org"
ON public.task_assignees FOR SELECT
USING (
  get_user_organization_id(auth.uid()) = get_user_organization_id(user_id)
);

CREATE POLICY "Users can create task assignees in their org"
ON public.task_assignees FOR INSERT
WITH CHECK (
  get_user_organization_id(auth.uid()) = get_user_organization_id(user_id)
);

CREATE POLICY "Users can delete task assignees in their org"
ON public.task_assignees FOR DELETE
USING (
  get_user_organization_id(auth.uid()) = get_user_organization_id(user_id)
);

-- Create index for fast lookups
CREATE INDEX idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON public.task_assignees(user_id);
