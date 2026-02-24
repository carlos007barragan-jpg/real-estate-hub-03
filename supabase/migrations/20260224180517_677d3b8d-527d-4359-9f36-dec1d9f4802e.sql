
-- Create commission_entries table for multi-agent payouts per deal
CREATE TABLE public.commission_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_user_id UUID,
  payout_amount NUMERIC NOT NULL DEFAULT 0,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;

-- All org members can view
CREATE POLICY "Org members can view commission entries"
  ON public.commission_entries
  FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

-- Only admins/supreme_admins can insert
CREATE POLICY "Admins can create commission entries"
  ON public.commission_entries
  FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supreme_admin'::app_role))
  );

-- Only admins/supreme_admins can update
CREATE POLICY "Admins can update commission entries"
  ON public.commission_entries
  FOR UPDATE
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supreme_admin'::app_role))
  );

-- Only admins/supreme_admins can delete
CREATE POLICY "Admins can delete commission entries"
  ON public.commission_entries
  FOR DELETE
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supreme_admin'::app_role))
  );

-- Index for fast lookups by lead
CREATE INDEX idx_commission_entries_lead_id ON public.commission_entries(lead_id);
CREATE INDEX idx_commission_entries_org_id ON public.commission_entries(organization_id);
