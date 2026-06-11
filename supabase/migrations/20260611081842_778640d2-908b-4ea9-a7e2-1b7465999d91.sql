CREATE TABLE IF NOT EXISTS public.service_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    criteria TEXT NOT NULL,
    percentage_applied NUMERIC(15,2),
    items_count INTEGER NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT ON public.service_price_history TO authenticated;
GRANT ALL ON public.service_price_history TO service_role;

-- RLS
ALTER TABLE public.service_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view price history" 
ON public.service_price_history FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert price history" 
ON public.service_price_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);