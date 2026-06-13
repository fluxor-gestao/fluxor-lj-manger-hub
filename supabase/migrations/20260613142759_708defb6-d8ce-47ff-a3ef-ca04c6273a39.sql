CREATE TABLE public.payment_planner (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_id UUID,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_aprovacao','pago','vencido','cancelado')),
  category TEXT,
  dre_group TEXT,
  account TEXT,
  business_unit TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_planner TO authenticated;
GRANT ALL ON public.payment_planner TO service_role;

ALTER TABLE public.payment_planner ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own planner items"
  ON public.payment_planner FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_payment_planner_user_due ON public.payment_planner(user_id, due_date);
CREATE INDEX idx_payment_planner_status ON public.payment_planner(status);

CREATE TRIGGER update_payment_planner_updated_at
  BEFORE UPDATE ON public.payment_planner
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();