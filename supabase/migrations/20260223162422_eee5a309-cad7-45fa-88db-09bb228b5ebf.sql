
-- Add last_active_at column to profiles for real-time presence tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

-- Allow authenticated users to update their own last_active_at
CREATE POLICY "Users can update their own last_active_at"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
