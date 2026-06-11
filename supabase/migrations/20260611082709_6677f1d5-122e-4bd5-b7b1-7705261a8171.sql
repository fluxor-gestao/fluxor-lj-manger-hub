-- Criar tabelas básicas
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bank TEXT,
    agency TEXT,
    account_number TEXT,
    pix_key TEXT,
    pix_type TEXT,
    holder_name TEXT,
    holder_document TEXT,
    business_unit TEXT,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_payment_methods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_cost_centers TO authenticated;

GRANT ALL ON public.financial_accounts TO service_role;
GRANT ALL ON public.financial_payment_methods TO service_role;
GRANT ALL ON public.financial_cost_centers TO service_role;

-- RLS
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_cost_centers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage financial_accounts') THEN
        CREATE POLICY "Users can manage financial_accounts" ON public.financial_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage financial_payment_methods') THEN
        CREATE POLICY "Users can manage financial_payment_methods" ON public.financial_payment_methods FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage financial_cost_centers') THEN
        CREATE POLICY "Users can manage financial_cost_centers" ON public.financial_cost_centers FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Trigger updated_at
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_financial_accounts_updated_at') THEN
        CREATE TRIGGER update_financial_accounts_updated_at 
        BEFORE UPDATE ON public.financial_accounts 
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Seed (ajustado para os termos em português aceitos pelo CHECK constraint)
INSERT INTO public.financial_payment_methods (name) 
SELECT name FROM (VALUES ('PIX'), ('Boleto'), ('Cartão de Crédito'), ('Dinheiro')) AS t(name)
WHERE NOT EXISTS (SELECT 1 FROM public.financial_payment_methods WHERE name = t.name);

INSERT INTO public.financial_categories (name, kind) 
SELECT name, kind FROM (VALUES ('Honorários', 'receita'), ('Consultoria', 'receita'), ('Aluguel', 'despesa'), ('Salários', 'despesa')) AS t(name, kind)
WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE name = t.name);

INSERT INTO public.financial_cost_centers (name) 
SELECT name FROM (VALUES ('Geral'), ('Comercial'), ('Operacional')) AS t(name)
WHERE NOT EXISTS (SELECT 1 FROM public.financial_cost_centers WHERE name = t.name);