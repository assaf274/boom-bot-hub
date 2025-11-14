-- Add notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "bot_disconnected": true,
  "bot_error": true,
  "new_message": true,
  "email_notifications": false
}'::jsonb;

-- Add avatar URL column if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;