-- Add transcription and answered_by fields to call_logs table
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS transcription text,
ADD COLUMN IF NOT EXISTS answered_by text,
ADD COLUMN IF NOT EXISTS direction text DEFAULT 'outbound';

-- Add index for faster queries on direction
CREATE INDEX IF NOT EXISTS idx_call_logs_direction ON call_logs(direction);

-- Add a field to leads to track if they came from inbound calls
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS source_call_sid text,
ADD COLUMN IF NOT EXISTS is_inbound_call boolean DEFAULT false;

-- Add index for faster queries on inbound calls
CREATE INDEX IF NOT EXISTS idx_leads_inbound_call ON leads(is_inbound_call) WHERE is_inbound_call = true;