
-- Create API keys table for organizations
CREATE TABLE public.organization_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  name TEXT NOT NULL DEFAULT 'Default API Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;

-- Admins can view API keys for their organization
CREATE POLICY "Admins can view org API keys"
  ON public.organization_api_keys
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'admin')
  );

-- Admins can create API keys for their organization
CREATE POLICY "Admins can create org API keys"
  ON public.organization_api_keys
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'admin')
  );

-- Admins can update API keys for their organization
CREATE POLICY "Admins can update org API keys"
  ON public.organization_api_keys
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'admin')
  );

-- Admins can delete API keys for their organization
CREATE POLICY "Admins can delete org API keys"
  ON public.organization_api_keys
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'admin')
  );

-- Create index for fast API key lookups from edge functions
CREATE INDEX idx_org_api_keys_key ON public.organization_api_keys(api_key) WHERE is_active = true;
CREATE INDEX idx_org_api_keys_org ON public.organization_api_keys(organization_id);
