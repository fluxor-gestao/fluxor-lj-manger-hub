ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS dre_group TEXT;
ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS account_category_id UUID REFERENCES public.financial_categories(id);

COMMENT ON COLUMN public.financial_entries.dre_group IS 'Grupo da DRE Gerencial (ex: Despesas com Pessoal)';
COMMENT ON COLUMN public.financial_entries.account_category_id IS 'Subconta/Categoria gerencial vinculada ao Plano de Contas';
