-- Create bot_target_groups table
CREATE TABLE public.bot_target_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_bot_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(external_bot_id, group_id)
);

-- Enable RLS
ALTER TABLE public.bot_target_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for bot_target_groups
CREATE POLICY "Users can view their bot target groups"
ON public.bot_target_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE bots.external_bot_id = bot_target_groups.external_bot_id
    AND (bots.user_id = auth.uid() OR bots.customer_id = auth.uid())
  )
);

CREATE POLICY "Admins can view all bot target groups"
ON public.bot_target_groups
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their bot target groups"
ON public.bot_target_groups
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE bots.external_bot_id = bot_target_groups.external_bot_id
    AND (bots.user_id = auth.uid() OR bots.customer_id = auth.uid())
  )
);

CREATE POLICY "Admins can insert bot target groups"
ON public.bot_target_groups
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their bot target groups"
ON public.bot_target_groups
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE bots.external_bot_id = bot_target_groups.external_bot_id
    AND (bots.user_id = auth.uid() OR bots.customer_id = auth.uid())
  )
);

CREATE POLICY "Admins can update all bot target groups"
ON public.bot_target_groups
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their bot target groups"
ON public.bot_target_groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.bots
    WHERE bots.external_bot_id = bot_target_groups.external_bot_id
    AND (bots.user_id = auth.uid() OR bots.customer_id = auth.uid())
  )
);

CREATE POLICY "Admins can delete all bot target groups"
ON public.bot_target_groups
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_bot_target_groups_updated_at
BEFORE UPDATE ON public.bot_target_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove target_group_id from profiles (no longer needed)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS target_group_id;