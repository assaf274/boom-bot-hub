-- Add missing columns to bots table
ALTER TABLE public.bots
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN phone_number text,
  ADD COLUMN qr_code text,
  ADD COLUMN connected_at timestamp with time zone,
  ADD COLUMN last_active timestamp with time zone,
  ADD COLUMN connection_id text,
  ADD COLUMN created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- Make user_id NOT NULL after adding it (existing rows will need to be handled)
-- For now, we'll allow NULL temporarily to avoid breaking existing data
-- ALTER TABLE public.bots ALTER COLUMN user_id SET NOT NULL;

-- Enable Row Level Security on bots table
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bots table

-- SELECT: Users can view their own bots
CREATE POLICY "Users can view their own bots"
ON public.bots
FOR SELECT
USING (auth.uid() = user_id);

-- SELECT: Admins can view all bots
CREATE POLICY "Admins can view all bots"
ON public.bots
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- INSERT: Users can create their own bots
CREATE POLICY "Users can insert their own bots"
ON public.bots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- INSERT: Admins can create bots for any user
CREATE POLICY "Admins can insert bots"
ON public.bots
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- UPDATE: Users can update their own bots
CREATE POLICY "Users can update their own bots"
ON public.bots
FOR UPDATE
USING (auth.uid() = user_id);

-- UPDATE: Admins can update all bots
CREATE POLICY "Admins can update all bots"
ON public.bots
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- DELETE: Users can delete their own bots
CREATE POLICY "Users can delete their own bots"
ON public.bots
FOR DELETE
USING (auth.uid() = user_id);

-- DELETE: Admins can delete all bots
CREATE POLICY "Admins can delete all bots"
ON public.bots
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_bots_updated_at
BEFORE UPDATE ON public.bots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to automatically update connected_at and last_active when status changes
CREATE TRIGGER update_bots_connection_timestamps
BEFORE INSERT OR UPDATE ON public.bots
FOR EACH ROW
EXECUTE FUNCTION public.update_bot_connected_at();