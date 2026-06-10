-- Add location enrichment columns to clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS location_status TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Create index on document for faster CNPJ lookups
CREATE INDEX IF NOT EXISTS idx_clients_document ON public.clients (document);

-- Update RLS if needed (usually public.clients is already managed)
-- Re-granting just in case it's a new migration environment
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
