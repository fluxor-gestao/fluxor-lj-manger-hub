
ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS target_region_city text,
  ADD COLUMN IF NOT EXISTS target_region_state text,
  ADD COLUMN IF NOT EXISTS target_region_country text,
  ADD COLUMN IF NOT EXISTS target_region_lat numeric,
  ADD COLUMN IF NOT EXISTS target_region_lng numeric,
  ADD COLUMN IF NOT EXISTS target_region_notes text;
