ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS additional_business_units text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.devis.additional_business_units IS
  'Empresas (códigos) adicionais envolvidas na proposta, além da business_unit principal. Usado para rateio multiempresa.';