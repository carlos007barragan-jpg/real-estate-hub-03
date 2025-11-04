-- Create custom_fields table to store field definitions
CREATE TABLE public.custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'email', 'phone', 'date', 'select', 'textarea')),
  options TEXT[], -- For select fields
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, field_name)
);

-- Enable RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own custom fields"
  ON public.custom_fields
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom fields"
  ON public.custom_fields
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom fields"
  ON public.custom_fields
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom fields"
  ON public.custom_fields
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add custom_data JSONB column to leads table to store custom field values
ALTER TABLE public.leads ADD COLUMN custom_data JSONB DEFAULT '{}'::jsonb;