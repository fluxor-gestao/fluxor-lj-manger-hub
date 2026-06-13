
ALTER TABLE public.historical_indicators
  ADD COLUMN IF NOT EXISTS area_slug text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'planilha_lj';

CREATE UNIQUE INDEX IF NOT EXISTS historical_indicators_year_month_area_source_uq
  ON public.historical_indicators (year, month, COALESCE(area_slug,''), COALESCE(source,''));
