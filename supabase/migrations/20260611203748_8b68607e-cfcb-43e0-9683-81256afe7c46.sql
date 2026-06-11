CREATE TABLE public.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    file_name TEXT NOT NULL,
    import_type TEXT NOT NULL, -- 'indicators' ou 'expenses'
    record_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'error'
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.historical_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    service_name TEXT,
    revenue_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    business_unit TEXT,
    import_log_id UUID REFERENCES public.import_logs(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(year, month, service_name, business_unit)
);

CREATE TABLE public.historical_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    dre_group TEXT NOT NULL,
    account_name TEXT NOT NULL,
    expense_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    business_unit TEXT,
    import_log_id UUID REFERENCES public.import_logs(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(year, month, dre_group, account_name, business_unit)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_logs TO authenticated;
GRANT ALL ON public.import_logs TO service_role;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all import logs" ON public.import_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own import logs" ON public.import_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.historical_indicators TO authenticated;
GRANT ALL ON public.historical_indicators TO service_role;
ALTER TABLE public.historical_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage historical indicators" ON public.historical_indicators FOR ALL TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.historical_expenses TO authenticated;
GRANT ALL ON public.historical_expenses TO service_role;
ALTER TABLE public.historical_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage historical expenses" ON public.historical_expenses FOR ALL TO authenticated USING (true);

-- Function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_historical_indicators_updated_at BEFORE UPDATE ON public.historical_indicators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_historical_expenses_updated_at BEFORE UPDATE ON public.historical_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();