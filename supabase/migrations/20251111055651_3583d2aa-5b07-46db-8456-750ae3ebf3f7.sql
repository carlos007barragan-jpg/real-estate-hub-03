-- Create table for customizable inventory field options
CREATE TABLE IF NOT EXISTS public.inventory_field_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('category', 'status', 'property_type')),
  option_value TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, field_type, option_value)
);

-- Enable RLS
ALTER TABLE public.inventory_field_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All users can view all field options"
ON public.inventory_field_options
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own field options"
ON public.inventory_field_options
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own field options"
ON public.inventory_field_options
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own field options"
ON public.inventory_field_options
FOR DELETE
USING (auth.uid() = user_id);

-- Insert default options for all users
INSERT INTO public.inventory_field_options (user_id, field_type, option_value, display_order)
SELECT 
  auth.uid(),
  'status',
  status_value,
  row_number
FROM (VALUES 
  ('available', 1),
  ('pending', 2),
  ('sold', 3),
  ('coming_soon', 4)
) AS defaults(status_value, row_number)
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, field_type, option_value) DO NOTHING;

INSERT INTO public.inventory_field_options (user_id, field_type, option_value, display_order)
SELECT 
  auth.uid(),
  'category',
  category_value,
  row_number
FROM (VALUES 
  ('Residential', 1),
  ('Commercial', 2),
  ('Land', 3),
  ('Multi-Family', 4)
) AS defaults(category_value, row_number)
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, field_type, option_value) DO NOTHING;

INSERT INTO public.inventory_field_options (user_id, field_type, option_value, display_order)
SELECT 
  auth.uid(),
  'property_type',
  type_value,
  row_number
FROM (VALUES 
  ('Single Family', 1),
  ('Condo', 2),
  ('Townhouse', 3),
  ('Multi-Family', 4),
  ('Land', 5),
  ('Commercial', 6)
) AS defaults(type_value, row_number)
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, field_type, option_value) DO NOTHING;