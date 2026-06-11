INSERT INTO public.business_units (code, name, description, active)
VALUES 
  ('DE', 'Direito Estratégico', 'Unidade de Direito Estratégico', true),
  ('AM', 'Ambiental', 'Unidade Ambiental', true),
  ('CO', 'Contabilidade', 'Unidade de Contabilidade', true),
  ('IM', 'Imobiliário', 'Unidade de Imobiliário', true),
  ('GE', 'Gestão & Consultoria', 'Unidade de Gestão & Consultoria', true)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, 
    description = EXCLUDED.description, 
    active = EXCLUDED.active;

-- Grant permissions if not already granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_units TO authenticated;
GRANT ALL ON public.business_units TO service_role;
