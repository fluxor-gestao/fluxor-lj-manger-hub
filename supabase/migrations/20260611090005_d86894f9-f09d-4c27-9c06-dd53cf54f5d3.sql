CREATE TABLE public.commercial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_settings TO authenticated;
GRANT ALL ON public.commercial_settings TO service_role;

ALTER TABLE public.commercial_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are viewable by all authenticated users"
  ON public.commercial_settings FOR SELECT
  USING (true);

CREATE POLICY "Settings can be managed by authenticated users"
  ON public.commercial_settings FOR ALL
  USING (auth.role() = 'authenticated');

-- Initialize settings for business units
INSERT INTO public.commercial_settings (key, value)
VALUES 
  ('devis_sequence_DE', '{"next_number": 1}'),
  ('devis_sequence_AM', '{"next_number": 1}'),
  ('devis_sequence_CO', '{"next_number": 1}'),
  ('devis_sequence_IM', '{"next_number": 1}'),
  ('devis_sequence_GE', '{"next_number": 1}')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.next_devis_number(_prefix text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  ym text; 
  next_seq int; 
  pfx text;
  config_key text;
  config_val int;
BEGIN
  pfx := upper(coalesce(_prefix,'DE'));
  IF pfx NOT IN ('DE','AM','CO','IM','GE') THEN pfx := 'DE'; END IF;
  
  ym := to_char(now(),'YYYYMM');
  config_key := 'devis_sequence_' || pfx;
  
  -- Get the configured next number
  SELECT (value->>'next_number')::int INTO config_val 
  FROM public.commercial_settings 
  WHERE key = config_key;
  
  -- Get the next sequence based on existing records
  SELECT COALESCE(MAX(CAST(SUBSTRING(devis_number FROM (length(pfx)+7)) AS INT)),0)+1
    INTO next_seq 
  FROM public.devis 
  WHERE devis_number LIKE pfx||ym||'%';
  
  -- Use the higher of the two to avoid collisions
  IF config_val IS NOT NULL AND config_val > next_seq THEN
    next_seq := config_val;
  END IF;

  RETURN pfx||ym||lpad(next_seq::text,3,'0');
END; $function$;