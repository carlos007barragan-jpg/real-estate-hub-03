-- Add created_by_user_id to track who books the appointment
ALTER TABLE public.appointments 
ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.appointments.created_by_user_id IS 'Tracks which user/agent created/booked this appointment for reporting and audit purposes';