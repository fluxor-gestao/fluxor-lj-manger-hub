ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS additional_business_units text[] NOT NULL DEFAULT '{}'::text[];