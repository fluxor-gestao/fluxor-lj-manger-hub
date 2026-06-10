-- Ensure devis_service_areas exists and is linked properly
CREATE TABLE IF NOT EXISTS public.devis_service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devis_id UUID NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
    area_slug TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for area analysis
CREATE INDEX IF NOT EXISTS idx_devis_service_areas_devis_id ON public.devis_service_areas(devis_id);
CREATE INDEX IF NOT EXISTS idx_devis_service_areas_slug ON public.devis_service_areas(area_slug);

-- Enable RLS and grant access
ALTER TABLE public.devis_service_areas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devis_service_areas TO authenticated;
GRANT ALL ON public.devis_service_areas TO service_role;

CREATE POLICY "Enable all for authenticated users" ON public.devis_service_areas FOR ALL TO authenticated USING (true);

-- Migrate existing single-area data to the multi-area table if empty
INSERT INTO public.devis_service_areas (devis_id, area_slug)
SELECT id, responsible_sector
FROM public.devis
WHERE responsible_sector IS NOT NULL 
  AND responsible_sector != ''
  AND id NOT IN (SELECT devis_id FROM public.devis_service_areas)
ON CONFLICT DO NOTHING;

-- Add area_slug to financial_entries for direct analysis
ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS area_slug TEXT;
CREATE INDEX IF NOT EXISTS idx_financial_entries_area_slug ON public.financial_entries(area_slug);

-- Function to automatically link devis and area to financial entries
CREATE OR REPLACE FUNCTION public.sync_financial_entry_devis_link()
RETURNS TRIGGER AS $$
DECLARE
    v_devis_id UUID;
    v_devis_number TEXT;
    v_area_slug TEXT;
BEGIN
    -- Only try to sync if document_reference looks like a UUID
    IF NEW.document_reference ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT id, devis_number, responsible_sector 
        INTO v_devis_id, v_devis_number, v_area_slug
        FROM public.devis
        WHERE id = NEW.document_reference::uuid;

        IF v_devis_id IS NOT NULL THEN
            NEW.devis_id := v_devis_id;
            NEW.devis_number := v_devis_number;
            -- If financial entry doesn't have an area, use the devis primary area
            IF NEW.area_slug IS NULL THEN
                NEW.area_slug := v_area_slug;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for syncing
DROP TRIGGER IF EXISTS trg_sync_financial_entry_devis_link ON public.financial_entries;
CREATE TRIGGER trg_sync_financial_entry_devis_link
BEFORE INSERT OR UPDATE OF document_reference ON public.financial_entries
FOR EACH ROW EXECUTE FUNCTION public.sync_financial_entry_devis_link();

-- One-time sync for existing entries
UPDATE public.financial_entries
SET devis_id = d.id,
    devis_number = d.devis_number,
    area_slug = COALESCE(area_slug, d.responsible_sector)
FROM public.devis d
WHERE financial_entries.document_reference ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND financial_entries.document_reference::uuid = d.id
  AND (financial_entries.devis_id IS NULL OR financial_entries.area_slug IS NULL);
