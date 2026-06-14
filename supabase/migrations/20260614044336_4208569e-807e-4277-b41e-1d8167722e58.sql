
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS fa_items JSONB,
  ADD COLUMN IF NOT EXISTS fa_area_allocations JSONB;

ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS fa_area_allocations JSONB;

COMMENT ON COLUMN public.services.fa_items IS 'Itens selecionados da tabela de Precificação para Fatura Avulsa: [{service_price_id,name,unit_price,quantity,total}]';
COMMENT ON COLUMN public.services.fa_area_allocations IS 'Rateio por área da FA: [{area_slug,business_unit,percent,amount}]';
COMMENT ON COLUMN public.financial_entries.fa_area_allocations IS 'Rateio por área da Fatura Avulsa correspondente (espelha services.fa_area_allocations).';
