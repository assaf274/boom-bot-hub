-- Add master_group_link column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS master_group_link TEXT;

COMMENT ON COLUMN public.profiles.master_group_link IS 'קישור לקבוצת הפצה ראשית של הלקוח - רק מנהל יכול לערוך';