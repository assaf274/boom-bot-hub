-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  whatsapp_id TEXT,
  participants_count INTEGER DEFAULT 0,
  group_order INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 256,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Users can view their own groups"
  ON public.groups
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all groups"
  ON public.groups
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own groups"
  ON public.groups
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all groups"
  ON public.groups
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own groups"
  ON public.groups
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all groups"
  ON public.groups
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_groups_user_id ON public.groups(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_order ON public.groups(group_order);