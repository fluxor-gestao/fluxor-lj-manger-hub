
-- =========================================
-- 1. suppliers
-- =========================================
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  email text,
  phone text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX suppliers_document_uniq ON public.suppliers (document) WHERE document IS NOT NULL;
CREATE INDEX suppliers_active_idx ON public.suppliers (active);
CREATE INDEX suppliers_name_lower_idx ON public.suppliers (lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin/financeiro manage suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role));
CREATE POLICY "authenticated read suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 2. financial_categories
-- =========================================
CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('receita','despesa','ambos')),
  parent_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX financial_categories_kind_active_idx ON public.financial_categories (kind, active);
CREATE INDEX financial_categories_parent_idx ON public.financial_categories (parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin/financeiro manage categories" ON public.financial_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role));
CREATE POLICY "authenticated read categories" ON public.financial_categories
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_financial_categories_updated_at BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 3. cost_centers
-- =========================================
CREATE TABLE public.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  business_unit text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cost_centers_bu_active_idx ON public.cost_centers (business_unit, active);
CREATE UNIQUE INDEX cost_centers_code_uniq ON public.cost_centers (code) WHERE code IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_centers TO authenticated;
GRANT ALL ON public.cost_centers TO service_role;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin/financeiro manage cost_centers" ON public.cost_centers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role));
CREATE POLICY "authenticated read cost_centers" ON public.cost_centers
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_cost_centers_updated_at BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 4. payment_methods
-- =========================================
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_methods_active_idx ON public.payment_methods (active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin/financeiro manage payment_methods" ON public.payment_methods
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role));
CREATE POLICY "authenticated read payment_methods" ON public.payment_methods
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 5. Estender financial_entries (colunas novas, todas nullable)
-- =========================================
ALTER TABLE public.financial_entries
  ADD COLUMN supplier_id        uuid REFERENCES public.suppliers(id)            ON DELETE SET NULL,
  ADD COLUMN client_id          uuid REFERENCES public.clients(id)              ON DELETE SET NULL,
  ADD COLUMN category_id        uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  ADD COLUMN cost_center_id     uuid REFERENCES public.cost_centers(id)         ON DELETE SET NULL,
  ADD COLUMN reference_code     text,
  ADD COLUMN competence_date    date,
  ADD COLUMN due_date           date,
  ADD COLUMN payment_method_id  uuid REFERENCES public.payment_methods(id)      ON DELETE SET NULL,
  ADD COLUMN payment_account_id uuid REFERENCES public.bank_accounts(id)        ON DELETE SET NULL,
  ADD COLUMN installment_number int,
  ADD COLUMN installment_total  int,
  ADD COLUMN paid_at            timestamptz,
  ADD COLUMN paid_amount        numeric(14,2),
  ADD COLUMN open_amount        numeric(14,2),
  ADD COLUMN payment_status     text,
  ADD COLUMN notes              text;

ALTER TABLE public.financial_entries
  ADD CONSTRAINT financial_entries_payment_status_chk
  CHECK (payment_status IS NULL OR payment_status IN ('aberto','parcial','pago','vencido','cancelado'));

CREATE INDEX financial_entries_supplier_idx        ON public.financial_entries (supplier_id);
CREATE INDEX financial_entries_client_idx          ON public.financial_entries (client_id);
CREATE INDEX financial_entries_category_idx        ON public.financial_entries (category_id);
CREATE INDEX financial_entries_cost_center_idx     ON public.financial_entries (cost_center_id);
CREATE INDEX financial_entries_payment_method_idx  ON public.financial_entries (payment_method_id);
CREATE INDEX financial_entries_payment_account_idx ON public.financial_entries (payment_account_id);
CREATE INDEX financial_entries_payment_status_idx  ON public.financial_entries (payment_status);
CREATE INDEX financial_entries_competence_date_idx ON public.financial_entries (competence_date);
CREATE INDEX financial_entries_due_open_idx        ON public.financial_entries (due_date)
  WHERE payment_status IN ('aberto','parcial','vencido');

-- =========================================
-- 6. entry_allocations (rateio)
-- =========================================
CREATE TABLE public.entry_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id       uuid NOT NULL REFERENCES public.financial_entries(id) ON DELETE CASCADE,
  category_id    uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  cost_center_id uuid REFERENCES public.cost_centers(id)         ON DELETE SET NULL,
  amount         numeric(14,2) NOT NULL,
  percent        numeric(7,4),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX entry_allocations_entry_idx        ON public.entry_allocations (entry_id);
CREATE INDEX entry_allocations_category_idx     ON public.entry_allocations (category_id);
CREATE INDEX entry_allocations_cost_center_idx  ON public.entry_allocations (cost_center_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_allocations TO authenticated;
GRANT ALL ON public.entry_allocations TO service_role;
ALTER TABLE public.entry_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin/financeiro manage entry_allocations" ON public.entry_allocations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role));
CREATE TRIGGER trg_entry_allocations_updated_at BEFORE UPDATE ON public.entry_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
