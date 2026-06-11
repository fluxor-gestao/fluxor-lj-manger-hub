ALTER TABLE public.service_prices ADD COLUMN IF NOT EXISTS business_unit TEXT;
ALTER TABLE public.service_prices ADD COLUMN IF NOT EXISTS responsible_sector TEXT;