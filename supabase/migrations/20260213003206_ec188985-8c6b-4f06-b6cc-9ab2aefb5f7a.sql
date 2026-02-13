
-- Create follow_ups table
CREATE TABLE public.follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'call',
  scheduled_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  template_name TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- RLS: users can see follow-ups in their organization
CREATE POLICY "Users can view follow-ups in their organization"
ON public.follow_ups FOR SELECT
USING (
  get_user_organization_id(auth.uid()) = get_user_organization_id(user_id)
);

CREATE POLICY "Users can create follow-ups in their organization"
ON public.follow_ups FOR INSERT
WITH CHECK (
  get_user_organization_id(auth.uid()) = get_user_organization_id(user_id)
);

CREATE POLICY "Users can update follow-ups in their organization"
ON public.follow_ups FOR UPDATE
USING (
  get_user_organization_id(auth.uid()) = get_user_organization_id(user_id)
);

CREATE POLICY "Users can delete follow-ups in their organization"
ON public.follow_ups FOR DELETE
USING (
  get_user_organization_id(auth.uid()) = get_user_organization_id(user_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_follow_ups_updated_at
BEFORE UPDATE ON public.follow_ups
FOR EACH ROW
EXECUTE FUNCTION public.update_leads_updated_at();

-- Index for fast lookups
CREATE INDEX idx_follow_ups_lead_id ON public.follow_ups(lead_id);
CREATE INDEX idx_follow_ups_user_id_status ON public.follow_ups(user_id, status);
CREATE INDEX idx_follow_ups_scheduled_date ON public.follow_ups(scheduled_date);
