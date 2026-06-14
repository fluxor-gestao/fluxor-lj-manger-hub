
-- 1) Coluna identificadora de FA no devis
ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS is_fa boolean NOT NULL DEFAULT false;

-- 2) Função: criar devis-espelho ao inserir um service marcado como FA
CREATE OR REPLACE FUNCTION public.fa_create_mirror_devis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_devis_id uuid;
  v_alloc jsonb;
  v_area text;
BEGIN
  IF NEW.is_fa IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF NEW.devis_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.devis (
    title,
    description,
    client_id,
    business_unit,
    additional_business_units,
    responsible_sector,
    devis_number,
    reference_number,
    total_amount,
    down_payment_amount,
    status,
    pricing_status,
    pricing_total,
    service_type,
    meeting_date,
    deadline_date,
    commercial_responsible,
    created_by,
    is_fa,
    notes
  ) VALUES (
    COALESCE(NEW.title, 'Fatura Avulsa'),
    NEW.description,
    NEW.client_id,
    NEW.business_unit,
    COALESCE(NEW.additional_business_units, ARRAY[]::text[]),
    NEW.responsible_sector,
    NEW.fa_number,
    NEW.fa_number,
    COALESCE(NEW.fa_amount, 0),
    COALESCE(NEW.fa_amount, 0),
    'pronta_para_envio'::devis_status,
    'aprovado',
    COALESCE(NEW.fa_amount, 0),
    'fa',
    CURRENT_DATE,
    NEW.fa_due_date,
    NEW.assigned_to,
    NEW.assigned_to,
    true,
    'Origem: Fatura Avulsa (FA) ' || COALESCE(NEW.fa_number, '')
  )
  RETURNING id INTO v_devis_id;

  -- Áreas: usa fa_area_allocations quando disponível, senão responsible_sector
  IF NEW.fa_area_allocations IS NOT NULL AND jsonb_typeof(NEW.fa_area_allocations) = 'array' THEN
    FOR v_alloc IN SELECT * FROM jsonb_array_elements(NEW.fa_area_allocations)
    LOOP
      v_area := v_alloc->>'area_slug';
      IF v_area IS NOT NULL AND v_area <> '' THEN
        INSERT INTO public.devis_service_areas (devis_id, area_slug)
        VALUES (v_devis_id, v_area)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  ELSIF NEW.responsible_sector IS NOT NULL AND NEW.responsible_sector <> '' THEN
    INSERT INTO public.devis_service_areas (devis_id, area_slug)
    VALUES (v_devis_id, NEW.responsible_sector)
    ON CONFLICT DO NOTHING;
  END IF;

  NEW.devis_id := v_devis_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fa_create_mirror_devis ON public.services;
CREATE TRIGGER trg_fa_create_mirror_devis
BEFORE INSERT ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.fa_create_mirror_devis();

-- 3) Função: deletar devis-espelho quando o service FA é apagado
CREATE OR REPLACE FUNCTION public.fa_delete_mirror_devis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_fa IS TRUE AND OLD.devis_id IS NOT NULL THEN
    DELETE FROM public.devis WHERE id = OLD.devis_id AND is_fa = true;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_fa_delete_mirror_devis ON public.services;
CREATE TRIGGER trg_fa_delete_mirror_devis
AFTER DELETE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.fa_delete_mirror_devis();

-- 4) Backfill: cria devis-espelho para FAs já existentes sem vínculo
DO $$
DECLARE
  r RECORD;
  v_devis_id uuid;
  v_alloc jsonb;
  v_area text;
BEGIN
  FOR r IN
    SELECT * FROM public.services
    WHERE is_fa = true AND devis_id IS NULL
  LOOP
    INSERT INTO public.devis (
      title, description, client_id, business_unit, additional_business_units,
      responsible_sector, devis_number, reference_number,
      total_amount, down_payment_amount,
      status, pricing_status, pricing_total, service_type,
      meeting_date, deadline_date, commercial_responsible, created_by, is_fa, notes
    ) VALUES (
      COALESCE(r.title, 'Fatura Avulsa'),
      r.description,
      r.client_id,
      r.business_unit,
      COALESCE(r.additional_business_units, ARRAY[]::text[]),
      r.responsible_sector,
      r.fa_number,
      r.fa_number,
      COALESCE(r.fa_amount, 0),
      COALESCE(r.fa_amount, 0),
      'pronta_para_envio'::devis_status,
      'aprovado',
      COALESCE(r.fa_amount, 0),
      'fa',
      CURRENT_DATE,
      r.fa_due_date,
      r.assigned_to,
      r.assigned_to,
      true,
      'Origem: Fatura Avulsa (FA) ' || COALESCE(r.fa_number, '')
    ) RETURNING id INTO v_devis_id;

    IF r.fa_area_allocations IS NOT NULL AND jsonb_typeof(r.fa_area_allocations) = 'array' THEN
      FOR v_alloc IN SELECT * FROM jsonb_array_elements(r.fa_area_allocations)
      LOOP
        v_area := v_alloc->>'area_slug';
        IF v_area IS NOT NULL AND v_area <> '' THEN
          INSERT INTO public.devis_service_areas (devis_id, area_slug)
          VALUES (v_devis_id, v_area) ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    ELSIF r.responsible_sector IS NOT NULL AND r.responsible_sector <> '' THEN
      INSERT INTO public.devis_service_areas (devis_id, area_slug)
      VALUES (v_devis_id, r.responsible_sector) ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.services SET devis_id = v_devis_id WHERE id = r.id;
  END LOOP;
END;
$$;
