CREATE TABLE IF NOT EXISTS public.business_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_areas TO authenticated;
GRANT ALL ON public.business_areas TO service_role;

-- RLS
ALTER TABLE public.business_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage business areas" ON public.business_areas
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_areas_updated_at
    BEFORE UPDATE ON public.business_areas
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();
