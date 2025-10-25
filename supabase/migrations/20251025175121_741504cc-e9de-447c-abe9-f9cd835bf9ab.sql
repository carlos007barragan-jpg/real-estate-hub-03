-- Add agent phone number to support inbound call routing
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agent_phone text;

-- Add index for faster queries on inbound calls
CREATE INDEX IF NOT EXISTS idx_leads_inbound_unassigned ON public.leads(is_inbound_call, assigned_to) WHERE is_inbound_call = true;

-- Create agents table to store agent phone numbers for call routing
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on agents table
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Agents can view all other agents
CREATE POLICY "Users can view all agents"
  ON public.agents
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own agent record
CREATE POLICY "Users can create their own agent record"
  ON public.agents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own agent record
CREATE POLICY "Users can update their own agent record"
  ON public.agents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);