-- Add devis columns to financial_entries
ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS devis_id UUID REFERENCES public.devis(id);
ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS devis_number TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_financial_entries_devis_id ON public.financial_entries(devis_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_devis_number ON public.financial_entries(devis_number);

-- Migrate existing data
-- Case 1: document_reference is the UUID of a Devis
UPDATE public.financial_entries fe
SET devis_id = fe.document_reference::uuid,
    devis_number = d.devis_number
FROM public.devis d
WHERE fe.document_reference ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND fe.document_reference::uuid = d.id
  AND (fe.devis_id IS NULL OR fe.devis_number IS NULL);

-- Case 2: document_reference contains a Devis number (e.g. "DV-2024-001")
UPDATE public.financial_entries fe
SET devis_id = d.id,
    devis_number = d.devis_number
FROM public.devis d
WHERE fe.document_reference = d.devis_number
  AND (fe.devis_id IS NULL OR fe.devis_number IS NULL);

-- Grant permissions (standard procedure)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;
