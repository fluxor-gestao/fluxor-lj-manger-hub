
-- Etapas/marcos faturáveis de uma Operação (service)
CREATE TABLE IF NOT EXISTS public.service_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee text,
  due_date date,
  priority text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'aberta', -- aberta | em_andamento | concluida
  billable boolean NOT NULL DEFAULT false,
  billing_type text, -- 'percent' | 'amount' | null
  billing_percent numeric,
  billing_amount numeric,
  completed_at timestamptz,
  charge_generated boolean NOT NULL DEFAULT false,
  charge_entry_id uuid REFERENCES public.financial_entries(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_milestones TO authenticated;
GRANT ALL ON public.service_milestones TO service_role;

ALTER TABLE public.service_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read service_milestones"
  ON public.service_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert service_milestones"
  ON public.service_milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update service_milestones"
  ON public.service_milestones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete service_milestones"
  ON public.service_milestones FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_service_milestones_service ON public.service_milestones(service_id);

CREATE TRIGGER trg_service_milestones_updated_at
  BEFORE UPDATE ON public.service_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função: gerar cobrança ao concluir etapa faturável (idempotente)
CREATE OR REPLACE FUNCTION public.create_milestone_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  svc RECORD;
  dv RECORD;
  client_name text;
  amt numeric;
  new_entry_id uuid;
  ref text;
BEGIN
  -- Dispara apenas na transição para concluida, faturável e ainda não gerou cobrança
  IF NEW.status <> 'concluida' THEN RETURN NEW; END IF;
  IF NOT NEW.billable THEN RETURN NEW; END IF;
  IF COALESCE(NEW.charge_generated, false) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'concluida' AND COALESCE(OLD.charge_generated,false) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO svc FROM public.services WHERE id = NEW.service_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF svc.devis_id IS NOT NULL THEN
    SELECT * INTO dv FROM public.devis WHERE id = svc.devis_id;
  END IF;

  -- Calcula valor
  IF NEW.billing_type = 'amount' AND COALESCE(NEW.billing_amount,0) > 0 THEN
    amt := NEW.billing_amount;
  ELSIF NEW.billing_type = 'percent' AND COALESCE(NEW.billing_percent,0) > 0 AND dv.total_amount IS NOT NULL THEN
    amt := ROUND(COALESCE(dv.total_amount,0) * NEW.billing_percent / 100.0, 2);
  ELSE
    amt := 0;
  END IF;

  IF amt <= 0 THEN
    -- Marca como gerado pra não tentar de novo, mas sem criar lançamento vazio
    NEW.charge_generated := true;
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    RETURN NEW;
  END IF;

  IF svc.client_id IS NOT NULL THEN
    SELECT name INTO client_name FROM public.clients WHERE id = svc.client_id;
  END IF;

  ref := COALESCE(svc.devis_id::text, svc.id::text);

  INSERT INTO public.financial_entries(
    entry_date, competence_month, business_unit,
    movement_description, counterparty_name,
    amount_in, amount_out, entry_type, source_type,
    conciliation_status, document_reference, user_id,
    notes
  ) VALUES (
    CURRENT_DATE, to_char(CURRENT_DATE,'YYYY-MM'), svc.business_unit,
    'Cobrança de etapa — '||NEW.title||
      CASE WHEN dv.devis_number IS NOT NULL THEN ' — Devis '||dv.devis_number ELSE '' END,
    client_name,
    amt, 0, 'receita'::public.entry_type, 'manual'::public.source_type,
    'pendente'::public.conciliation_status, ref, NEW.created_by,
    'Aguardando envio — gerada automaticamente pela conclusão da etapa operacional.'
  )
  RETURNING id INTO new_entry_id;

  NEW.charge_entry_id := new_entry_id;
  NEW.charge_generated := true;
  NEW.completed_at := COALESCE(NEW.completed_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_milestone_charge ON public.service_milestones;
CREATE TRIGGER trg_milestone_charge
  BEFORE INSERT OR UPDATE ON public.service_milestones
  FOR EACH ROW EXECUTE FUNCTION public.create_milestone_charge();
