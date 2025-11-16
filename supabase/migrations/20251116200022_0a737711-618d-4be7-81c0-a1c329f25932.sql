-- Drop existing bots table if exists
DROP TABLE IF EXISTS public.bots CASCADE;

-- Create bots table with exact structure
CREATE TABLE public.bots (
  external_bot_id text PRIMARY KEY,
  bot_name text NOT NULL,
  status text NOT NULL
);