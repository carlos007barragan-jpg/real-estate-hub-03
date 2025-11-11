-- Create transaction_types table
CREATE TABLE public.transaction_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transaction_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All users can view all transaction types"
ON public.transaction_types
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own transaction types"
ON public.transaction_types
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transaction types"
ON public.transaction_types
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transaction types"
ON public.transaction_types
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_transaction_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transaction_types_updated_at
BEFORE UPDATE ON public.transaction_types
FOR EACH ROW
EXECUTE FUNCTION public.update_transaction_types_updated_at();

-- Insert default transaction types (will be owned by the first user who creates them)
-- Note: These will be inserted when users first access the feature