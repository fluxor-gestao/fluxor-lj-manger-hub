ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS trade_name TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS street_number TEXT,
ADD COLUMN IF NOT EXISTS location_source TEXT;

-- Update existing records to have a default value if needed or keep null
COMMENT ON COLUMN public.clients.trade_name IS 'Nome fantasia da empresa';
COMMENT ON COLUMN public.clients.neighborhood IS 'Bairro do endereço';
COMMENT ON COLUMN public.clients.street_number IS 'Número do endereço';
COMMENT ON COLUMN public.clients.location_source IS 'Fonte dos dados de localização';