-- Create inventory table
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10, 2),
  category TEXT,
  sku TEXT,
  photo_url TEXT,
  google_sheet_row_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_demo_data BOOLEAN DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory access
CREATE POLICY "Users can view all inventory" 
ON public.inventory 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own inventory" 
ON public.inventory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory" 
ON public.inventory 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory" 
ON public.inventory 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_leads_updated_at();

-- Create storage bucket for inventory photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('inventory-photos', 'inventory-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for inventory photos
CREATE POLICY "Inventory photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'inventory-photos');

CREATE POLICY "Users can upload their own inventory photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own inventory photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own inventory photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);