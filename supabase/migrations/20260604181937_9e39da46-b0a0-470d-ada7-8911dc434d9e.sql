
ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS title_secondary text,
  ADD COLUMN IF NOT EXISTS scope_description_secondary text,
  ADD COLUMN IF NOT EXISTS proposal_structure_secondary text,
  ADD COLUMN IF NOT EXISTS scope_items_secondary jsonb,
  ADD COLUMN IF NOT EXISTS payment_terms_secondary text,
  ADD COLUMN IF NOT EXISTS assumptions_secondary jsonb,
  ADD COLUMN IF NOT EXISTS secondary_language text;
