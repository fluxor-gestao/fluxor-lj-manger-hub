-- Garantir que a publicação existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Adicionar tabelas à publicação para habilitar o Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_areas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devis;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cost_centers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_methods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
