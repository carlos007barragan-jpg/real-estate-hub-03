-- Create owner_invitations table for tracking admin invites
CREATE TABLE IF NOT EXISTS public.owner_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  type_of_owner TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT owner_invitations_status_check CHECK (status IN ('pending', 'accepted', 'expired'))
);

-- Add dispo_sheet_link to inventory for shareable links
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS dispo_sheet_link TEXT;

-- Enable RLS on owner_invitations
ALTER TABLE public.owner_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view invitations they created
CREATE POLICY "Admins can view their invitations"
ON public.owner_invitations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') AND invited_by = auth.uid());

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
ON public.owner_invitations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND invited_by = auth.uid());

-- System can update invitation status
CREATE POLICY "System can update invitations"
ON public.owner_invitations
FOR UPDATE
TO authenticated
USING (true);

-- Users can view invitation by token (for accepting invites)
CREATE POLICY "Users can view invitation by token"
ON public.owner_invitations
FOR SELECT
TO anon
USING (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_invitations_token ON public.owner_invitations(token);
CREATE INDEX IF NOT EXISTS idx_owner_invitations_email ON public.owner_invitations(email);