ALTER TABLE public.leads ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.leads ADD COLUMN archived_at timestamptz;