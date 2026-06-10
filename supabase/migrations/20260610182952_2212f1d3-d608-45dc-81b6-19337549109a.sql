-- Adicionar status e total de precificação ao Devis
ALTER TABLE public.devis 
ADD COLUMN IF NOT EXISTS pricing_status TEXT DEFAULT 'sem_precificacao',
ADD COLUMN IF NOT EXISTS pricing_total NUMERIC DEFAULT 0;

-- Tabela de itens de precificação do Devis
CREATE TABLE IF NOT EXISTS public.devis_pricing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devis_id UUID NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
    service_price_id UUID REFERENCES public.service_prices(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devis_pricing_items TO authenticated;
GRANT ALL ON public.devis_pricing_items TO service_role;

-- RLS
ALTER TABLE public.devis_pricing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage devis pricing items" ON public.devis_pricing_items
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Trigger para updated_at em devis_pricing_items
CREATE TRIGGER update_devis_pricing_items_updated_at
    BEFORE UPDATE ON public.devis_pricing_items
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();
