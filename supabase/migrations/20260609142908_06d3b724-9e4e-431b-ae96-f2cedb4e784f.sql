ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS responsible_sector TEXT;
GRANT ALL ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;