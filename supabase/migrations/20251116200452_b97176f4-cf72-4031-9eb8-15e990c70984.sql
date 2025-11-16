-- Drop existing bots table if exists
DROP TABLE IF EXISTS public.bots CASCADE;

-- Create bots table with id as primary key
CREATE TABLE public.bots (
  id bigserial PRIMARY KEY,
  external_bot_id text,
  bot_name text,
  status text
);