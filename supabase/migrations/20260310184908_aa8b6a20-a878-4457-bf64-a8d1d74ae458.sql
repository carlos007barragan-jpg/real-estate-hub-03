ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_inbound_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS merged_from_lead_id uuid DEFAULT NULL;