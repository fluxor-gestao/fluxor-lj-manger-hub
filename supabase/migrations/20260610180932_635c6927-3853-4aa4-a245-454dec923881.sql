-- Criação da tabela de relacionamento muitos-para-muitos entre Devis e Áreas
CREATE TABLE IF NOT EXISTS public.devis_service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devis_id UUID NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
    area_slug TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devis_service_areas TO authenticated;
GRANT ALL ON public.devis_service_areas TO service_role;

-- RLS
ALTER TABLE public.devis_service_areas ENABLE ROW LEVEL SECURITY;

-- Política simples: usuários autenticados podem gerenciar
CREATE POLICY "Users can manage devis areas" ON public.devis_service_areas
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Migração de dados existentes: espelhar responsible_sector para a nova tabela
-- Apenas para devis que já possuem um setor definido
INSERT INTO public.devis_service_areas (devis_id, area_slug)
SELECT id, responsible_sector 
FROM public.devis 
WHERE responsible_sector IS NOT NULL AND responsible_sector <> ''
ON CONFLICT DO NOTHING;
