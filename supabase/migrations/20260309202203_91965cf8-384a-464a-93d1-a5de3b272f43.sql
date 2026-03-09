
ALTER TABLE public.leads
ADD COLUMN initial_consult_completed boolean NOT NULL DEFAULT false,
ADD COLUMN consult_date timestamptz,
ADD COLUMN consult_notes text;
