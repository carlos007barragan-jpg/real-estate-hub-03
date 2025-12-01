-- Create lead_assignments table for multi-agent assignment
CREATE TABLE public.lead_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE(lead_id, user_id)
);

-- Enable RLS
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for lead_assignments
CREATE POLICY "Users can view their own assignments"
ON public.lead_assignments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all assignments in their org"
ON public.lead_assignments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  EXISTS (
    SELECT 1 FROM leads l
    JOIN profiles p1 ON l.user_id = p1.user_id
    JOIN profiles p2 ON p2.user_id = auth.uid()
    WHERE l.id = lead_assignments.lead_id
    AND p1.organization_id = p2.organization_id
  )
);

CREATE POLICY "Users can create assignments for leads they own or are admin"
ON public.lead_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = lead_id AND (l.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users can delete their own assignments or admins can delete any"
ON public.lead_assignments
FOR DELETE
USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create index for faster lookups
CREATE INDEX idx_lead_assignments_lead_id ON public.lead_assignments(lead_id);
CREATE INDEX idx_lead_assignments_user_id ON public.lead_assignments(user_id);