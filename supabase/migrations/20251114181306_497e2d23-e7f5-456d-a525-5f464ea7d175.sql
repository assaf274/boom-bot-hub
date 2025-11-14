-- Create enum for bot status
CREATE TYPE public.bot_status AS ENUM ('connected', 'disconnected', 'pending');

-- Create bots table
CREATE TABLE public.bots (
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

-- Add index for faster queries
CREATE INDEX idx_bots_user_id ON public.bots(user_id);
CREATE INDEX idx_bots_status ON public.bots(status);

-- Enable RLS
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

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
