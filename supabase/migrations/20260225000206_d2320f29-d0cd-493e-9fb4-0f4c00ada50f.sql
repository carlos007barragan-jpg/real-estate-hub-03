
-- Create lead_deals table
CREATE TABLE public.lead_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  pipeline_id UUID NOT NULL,
  pipeline_stage TEXT NOT NULL,
  transaction_type TEXT,
  deal_label TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  display_order INT NOT NULL DEFAULT 1,
  sales_price TEXT,
  commission TEXT,
  agent_payout TEXT,
  property_of_interest TEXT,
  title_office TEXT,
  close_date DATE,
  created_by UUID NOT NULL,
  organization_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_deals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view lead deals"
  ON public.lead_deals FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can create lead deals"
  ON public.lead_deals FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can update lead deals"
  ON public.lead_deals FOR UPDATE
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can delete lead deals"
  ON public.lead_deals FOR DELETE
  USING (organization_id = get_user_organization_id(auth.uid()));

-- Max 3 active deals trigger
CREATE OR REPLACE FUNCTION public.check_max_lead_deals()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.lead_deals WHERE lead_id = NEW.lead_id AND status = 'active') >= 3 THEN
    RAISE EXCEPTION 'A lead can have at most 3 active deals';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER enforce_max_lead_deals
  BEFORE INSERT ON public.lead_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_lead_deals();

-- Updated_at trigger
CREATE TRIGGER update_lead_deals_updated_at
  BEFORE UPDATE ON public.lead_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add deal_id to commission_entries
ALTER TABLE public.commission_entries
  ADD COLUMN deal_id UUID REFERENCES public.lead_deals(id) ON DELETE SET NULL;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_deals;

-- Data migration: copy existing pipeline data into lead_deals
INSERT INTO public.lead_deals (lead_id, pipeline_id, pipeline_stage, transaction_type, deal_label, status, display_order, sales_price, commission, agent_payout, property_of_interest, title_office, close_date, created_by, organization_id)
SELECT
  l.id,
  p.id,
  l.pipeline_stage,
  NULL,
  p.name || ' Deal',
  CASE WHEN l.status = 'won' THEN 'won' ELSE 'active' END,
  1,
  l.sales_price,
  l.commission,
  l.agent_payout,
  l.property_of_interest,
  l.title_office,
  l.close_date::date,
  l.user_id,
  prof.organization_id
FROM public.leads l
JOIN public.pipelines p ON p.id::text = l.pipeline
JOIN public.profiles prof ON prof.user_id = l.user_id
WHERE l.pipeline IS NOT NULL
  AND prof.organization_id IS NOT NULL;
