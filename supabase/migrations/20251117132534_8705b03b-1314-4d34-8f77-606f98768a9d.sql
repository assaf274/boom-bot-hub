-- Add target_group_id field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS target_group_id TEXT;