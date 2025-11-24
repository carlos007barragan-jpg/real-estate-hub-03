-- Update inventory table to support multiple photos
-- Change photo_url from single string to JSONB array of URLs
ALTER TABLE public.inventory 
ADD COLUMN photo_urls JSONB DEFAULT '[]'::jsonb;

-- Migrate existing photo_url data to photo_urls array
UPDATE public.inventory 
SET photo_urls = jsonb_build_array(photo_url)
WHERE photo_url IS NOT NULL AND photo_url != '';

-- Keep photo_url column for backward compatibility but it will be deprecated
-- New code will use photo_urls array