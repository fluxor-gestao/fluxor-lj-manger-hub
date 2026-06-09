-- Add company column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'company') THEN
    ALTER TABLE public.clients ADD COLUMN company TEXT;
  END IF;
END $$;

-- Update RLS policies to include the new column (standard practice for public schema tables)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
