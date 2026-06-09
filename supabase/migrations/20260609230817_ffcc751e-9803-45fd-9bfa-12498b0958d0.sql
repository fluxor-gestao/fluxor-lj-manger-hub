-- 1. Corrigir os registros existentes que estão "escondidos" (open_amount is null)
UPDATE public.financial_entries
SET 
  open_amount = COALESCE(amount_in, 0),
  paid_amount = 0,
  payment_status = 'aberto',
  due_date = COALESCE(due_date, (created_at::date + interval '7 days')::date)
WHERE open_amount IS NULL 
  AND (movement_description LIKE '%Devis #%' OR movement_description LIKE '%Cobrança%');

-- 2. Vincular o client_id correto para os lançamentos do Devis dcbe681a
UPDATE public.financial_entries fe
SET client_id = d.client_id
FROM public.devis d
WHERE fe.movement_description LIKE '%dcbe681a%'
  AND d.id = 'dcbe681a-3f56-4399-8b20-ed724d39f2b2'
  AND fe.client_id IS NULL;

-- 3. Trigger para garantir que novos registros inseridos tenham o open_amount calculado se não for fornecido
CREATE OR REPLACE FUNCTION public.fn_ensure_financial_open_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Se open_amount vier nulo, inicializa com o valor total (amount_in ou amount_out)
  IF NEW.open_amount IS NULL THEN
    NEW.open_amount := COALESCE(NEW.amount_in, 0) + COALESCE(NEW.amount_out, 0);
  END IF;
  
  -- Se paid_amount vier nulo, inicializa com 0
  IF NEW.paid_amount IS NULL THEN
    NEW.paid_amount := 0;
  END IF;

  -- Se o status vier nulo, define baseado no saldo
  IF NEW.payment_status IS NULL THEN
    IF NEW.open_amount <= 0 THEN
      NEW.payment_status := 'pago';
    ELSE
      NEW.payment_status := 'aberto';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ensure_financial_open_amount ON public.financial_entries;
CREATE TRIGGER tr_ensure_financial_open_amount
BEFORE INSERT ON public.financial_entries
FOR EACH ROW
EXECUTE FUNCTION public.fn_ensure_financial_open_amount();
