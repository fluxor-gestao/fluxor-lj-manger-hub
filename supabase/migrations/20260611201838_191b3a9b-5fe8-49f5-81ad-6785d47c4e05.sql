ALTER TABLE public.financial_categories ADD COLUMN IF NOT EXISTS dre_group TEXT;
ALTER TABLE public.financial_categories ADD COLUMN IF NOT EXISTS code TEXT;

-- Update existing categories to have a default dre_group if needed, 
-- but we will mainly be inserting the new structure.

GRANT ALL ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;
