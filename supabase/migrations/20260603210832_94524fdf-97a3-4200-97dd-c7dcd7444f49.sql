CREATE TABLE public.financial_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_entry_id uuid NOT NULL REFERENCES public.financial_entries(id) ON DELETE RESTRICT,
  bank_statement_entry_id uuid REFERENCES public.bank_statement_entries(id) ON DELETE SET NULL,
  conciliation_match_id uuid REFERENCES public.conciliation_matches(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_at date NOT NULL DEFAULT current_date,
  payment_method_id uuid REFERENCES public.payment_methods(id),
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_payments_entry ON public.financial_payments(financial_entry_id);
CREATE INDEX idx_financial_payments_stmt ON public.financial_payments(bank_statement_entry_id);
CREATE INDEX idx_financial_payments_paid_at ON public.financial_payments(paid_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_payments TO authenticated;
GRANT ALL ON public.financial_payments TO service_role;

ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_payments_admin_financeiro_all"
ON public.financial_payments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));