CREATE TABLE public.financial_classification_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.financial_categories(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    occurrence_count INTEGER DEFAULT 1,
    confidence_level FLOAT DEFAULT 0.5,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast pattern matching
CREATE INDEX idx_classification_rules_pattern ON public.financial_classification_rules (pattern);
CREATE INDEX idx_classification_rules_client ON public.financial_classification_rules (client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_classification_rules TO authenticated;
GRANT ALL ON public.financial_classification_rules TO service_role;

-- Trigger to update updated_at
CREATE TRIGGER update_classification_rules_updated_at BEFORE UPDATE ON public.financial_classification_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
