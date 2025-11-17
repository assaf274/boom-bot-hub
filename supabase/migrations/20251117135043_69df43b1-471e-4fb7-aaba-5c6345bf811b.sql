-- Drop old table if exists
DROP TABLE IF EXISTS public.bot_target_groups;

-- Create bot_distribution_groups table
CREATE TABLE public.bot_distribution_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id bigint REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  group_id text NOT NULL,
  group_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.bot_distribution_groups ENABLE ROW LEVEL SECURITY;

-- Policies for users to manage their bot distribution groups
CREATE POLICY "Users can view their bot distribution groups"
  ON public.bot_distribution_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_distribution_groups.bot_id
      AND (bots.user_id = auth.uid() OR bots.customer_id = auth.uid())
    )
  );

CREATE POLICY "Admins can view all bot distribution groups"
  ON public.bot_distribution_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert their bot distribution groups"
  ON public.bot_distribution_groups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_distribution_groups.bot_id
      AND (bots.user_id = auth.uid() OR bots.customer_id = auth.uid())
    )
  );

CREATE POLICY "Admins can insert bot distribution groups"
  ON public.bot_distribution_groups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete their bot distribution groups"
  ON public.bot_distribution_groups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_distribution_groups.bot_id
      AND (bots.user_id = auth.uid() OR bots.customer_id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete bot distribution groups"
  ON public.bot_distribution_groups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );