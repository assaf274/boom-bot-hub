-- Create bots table
CREATE TABLE IF NOT EXISTS public.bots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_bot_id text,
  bot_name text,
  status text DEFAULT 'active'
);