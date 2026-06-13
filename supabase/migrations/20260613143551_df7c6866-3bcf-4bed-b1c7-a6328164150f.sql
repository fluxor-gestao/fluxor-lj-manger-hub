ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_fa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fa_number text,
  ADD COLUMN IF NOT EXISTS fa_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS fa_due_date date,
  ADD COLUMN IF NOT EXISTS fa_attachment_url text,
  ADD COLUMN IF NOT EXISTS fa_attachment_name text,
  ADD COLUMN IF NOT EXISTS client_company_snapshot text,
  ADD COLUMN IF NOT EXISTS service_price_id uuid,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'devis';

CREATE UNIQUE INDEX IF NOT EXISTS services_fa_number_uq
  ON public.services(fa_number) WHERE fa_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS services_origin_idx ON public.services(origin);

CREATE OR REPLACE FUNCTION public.next_fa_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ym text;
  next_seq int;
BEGIN
  ym := to_char(now(), 'YYYYMM');
  SELECT COALESCE(MAX(CAST(SUBSTRING(fa_number FROM 9) AS INT)), 0) + 1
    INTO next_seq
  FROM public.services
  WHERE fa_number LIKE 'FA' || ym || '%';
  RETURN 'FA' || ym || lpad(next_seq::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_fa_number() TO authenticated;