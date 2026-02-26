
-- Add video support to inventory table
ALTER TABLE public.inventory
ADD COLUMN video_url text NULL,
ADD COLUMN video_type text NULL; -- 'upload' or 'external'
