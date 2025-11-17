-- Create system_settings table for application-wide configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view all settings
CREATE POLICY "Admins can view all settings"
ON public.system_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update settings
CREATE POLICY "Admins can update settings"
ON public.system_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.system_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default MASTER_GROUP_ID setting
INSERT INTO public.system_settings (key, value, description)
VALUES ('MASTER_GROUP_ID', '', 'WhatsApp Group ID for message distribution master group')
ON CONFLICT (key) DO NOTHING;