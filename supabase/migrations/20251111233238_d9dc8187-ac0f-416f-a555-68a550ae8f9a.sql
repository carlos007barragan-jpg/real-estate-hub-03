-- Enable realtime for inventory_field_options table
ALTER TABLE public.inventory_field_options REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_field_options;