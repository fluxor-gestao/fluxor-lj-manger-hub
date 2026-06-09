ALTER TABLE public.services ADD COLUMN IF NOT EXISTS business_unit TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS responsible_sector TEXT;