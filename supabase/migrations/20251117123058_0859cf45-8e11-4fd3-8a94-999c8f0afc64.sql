-- Add customer_id column to bots table
ALTER TABLE public.bots 
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bots_customer_id ON public.bots(customer_id);

-- Update RLS policies to use customer_id
DROP POLICY IF EXISTS "Users can view their own bots" ON public.bots;
CREATE POLICY "Users can view their own bots"
ON public.bots
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own bots" ON public.bots;
CREATE POLICY "Users can insert their own bots"
ON public.bots
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bots" ON public.bots;
CREATE POLICY "Users can update their own bots"
ON public.bots
FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bots" ON public.bots;
CREATE POLICY "Users can delete their own bots"
ON public.bots
FOR DELETE
TO authenticated
USING (auth.uid() = customer_id OR auth.uid() = user_id);

-- Migrate existing data: set customer_id = user_id for existing bots
UPDATE public.bots 
SET customer_id = user_id 
WHERE customer_id IS NULL AND user_id IS NOT NULL;