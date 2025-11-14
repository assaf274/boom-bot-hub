-- Create enum for bot status if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bot_status') THEN
        CREATE TYPE public.bot_status AS ENUM ('connected', 'disconnected', 'pending');
    END IF;
END $$;

-- Create bots table
CREATE TABLE IF NOT EXISTS public.bots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    bot_name text NOT NULL,
    connection_id text,
    qr_code text,
    status bot_status DEFAULT 'pending' NOT NULL,
    connected_at timestamptz,
    last_active timestamptz,
    phone_number text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON public.bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_status ON public.bots(status);

-- Enable RLS
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own bots" ON public.bots;
DROP POLICY IF EXISTS "Admins can view all bots" ON public.bots;
DROP POLICY IF EXISTS "Users can update their own bots" ON public.bots;
DROP POLICY IF EXISTS "Admins can update all bots" ON public.bots;
DROP POLICY IF EXISTS "Admins can insert bots" ON public.bots;
DROP POLICY IF EXISTS "Admins can delete bots" ON public.bots;
DROP POLICY IF EXISTS "Users can delete their own bots" ON public.bots;

-- RLS Policies for bots

-- Users can view their own bots
CREATE POLICY "Users can view their own bots"
ON public.bots
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all bots
CREATE POLICY "Admins can view all bots"
ON public.bots
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can update their own bots (for QR refresh, status updates)
CREATE POLICY "Users can update their own bots"
ON public.bots
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can update all bots
CREATE POLICY "Admins can update all bots"
ON public.bots
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert bots
CREATE POLICY "Admins can insert bots"
ON public.bots
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete bots
CREATE POLICY "Admins can delete bots"
ON public.bots
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can delete their own bots
CREATE POLICY "Users can delete their own bots"
ON public.bots
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_bots_updated_at ON public.bots;
DROP TRIGGER IF EXISTS set_bot_connected_at ON public.bots;

-- Trigger to update updated_at on bots
CREATE TRIGGER update_bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically set connected_at when status changes to connected
CREATE OR REPLACE FUNCTION public.update_bot_connected_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'connected' AND OLD.status != 'connected' THEN
    NEW.connected_at = now();
    NEW.last_active = now();
  END IF;
  
  IF NEW.status = 'connected' THEN
    NEW.last_active = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically update connected_at
CREATE TRIGGER set_bot_connected_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bot_connected_at();
