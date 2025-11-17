-- Add message_delay_seconds field to profiles table
ALTER TABLE public.profiles
ADD COLUMN message_delay_seconds integer DEFAULT 0;

COMMENT ON COLUMN public.profiles.message_delay_seconds IS 'Delay in seconds between messages for all customer bots (default: 0 = no delay)';