
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS state TEXT;

UPDATE public.inventory 
SET show_on_public_page = true,
    city = 'Kansas City',
    state = 'MO'
WHERE id = '1067e3ce-cda8-4292-bffd-515d70cbfd29';
