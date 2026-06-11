ALTER TABLE public.business_areas 
ADD COLUMN IF NOT EXISTS business_unit TEXT,
ADD COLUMN IF NOT EXISTS label TEXT;

-- Seed data ensuring all columns (new and old) are handled
-- Use 'name' for the old schema and 'label' for the new one simultaneously
INSERT INTO public.business_areas (business_unit, label, name, slug, display_order, is_active) VALUES
('DE', 'Migratório', 'Migratório', 'migratorio', 1, true),
('DE', 'Civil', 'Civil', 'civil', 2, true),
('DE', 'Contencioso', 'Contencioso', 'contencioso', 3, true),
('DE', 'Consultivo', 'Consultivo', 'consultivo', 4, true),
('AM', 'Topografia', 'Topografia', 'topografia', 1, true),
('AM', 'Licenciamento', 'Licenciamento', 'licenciamento', 2, true),
('AM', 'Regularização', 'Regularização', 'regularizacao', 3, true),
('CO', 'Fiscal', 'Fiscal', 'fiscal', 1, true),
('CO', 'Contábil', 'Contábil', 'contabil', 2, true),
('CO', 'Departamento Pessoal', 'Departamento Pessoal', 'departamento_pessoal', 3, true),
('IM', 'Venda de Imóveis', 'Venda de Imóveis', 'venda_imoveis', 1, true),
('IM', 'Regularização Imobiliária', 'Regularização Imobiliária', 'regularizacao_imobiliaria', 2, true),
('IM', 'Administração de Imóveis', 'Administração de Imóveis', 'administracao_imoveis', 3, true),
('GE', 'Consultoria', 'Consultoria', 'consultoria', 1, true),
('GE', 'BPO Financeiro', 'BPO Financeiro', 'bpo_financeiro', 2, true),
('GE', 'Planejamento', 'Planejamento', 'planejamento', 3, true)
ON CONFLICT (slug) DO UPDATE SET 
    business_unit = EXCLUDED.business_unit,
    label = EXCLUDED.label,
    name = EXCLUDED.label;

-- Add unique constraint after cleanup
ALTER TABLE public.business_areas DROP CONSTRAINT IF EXISTS business_areas_business_unit_slug_key;
ALTER TABLE public.business_areas ADD CONSTRAINT business_areas_business_unit_slug_key UNIQUE (business_unit, slug);

-- Final adjustments
ALTER TABLE public.business_areas ALTER COLUMN business_unit SET NOT NULL;
ALTER TABLE public.business_areas ALTER COLUMN label SET NOT NULL;
ALTER TABLE public.business_areas ALTER COLUMN name SET NOT NULL;