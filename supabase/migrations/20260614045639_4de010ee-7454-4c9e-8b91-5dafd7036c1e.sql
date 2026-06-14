
ALTER TABLE public.financial_accounts
  ADD COLUMN IF NOT EXISTS business_units TEXT[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.financial_accounts.business_units IS 'Unidades de negócio vinculadas. Lista vazia = todas as unidades. Substitui o campo legado business_unit (mantido para compat).';
