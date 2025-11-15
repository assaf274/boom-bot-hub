-- Add external_bot_id column to bots table
ALTER TABLE public.bots 
ADD COLUMN external_bot_id text;