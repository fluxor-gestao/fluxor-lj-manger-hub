CREATE TABLE public.service_prices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC(15,2) NOT NULL DEFAULT 0,
    market_price NUMERIC(15,2),
    last_market_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_prices TO authenticated;
GRANT ALL ON public.service_prices TO service_role;

ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage service prices" ON public.service_prices
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE TRIGGER update_service_prices_updated_at
    BEFORE UPDATE ON public.service_prices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();