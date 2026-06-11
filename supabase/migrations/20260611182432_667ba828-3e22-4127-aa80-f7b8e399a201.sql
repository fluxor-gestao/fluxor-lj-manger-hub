ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_enrichment_query TEXT;

COMMENT ON COLUMN public.clients.country IS 'Country of the client for international search';
COMMENT ON COLUMN public.clients.is_international IS 'Flag to identify if the client is based outside Brazil';
COMMENT ON COLUMN public.clients.last_enrichment_query IS 'The last query used to find the client location';