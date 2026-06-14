-- Trigger: ao pagar (pago) uma cobrança FA em financial_entries, mover devis-espelho para entrada_recebida
CREATE OR REPLACE FUNCTION public.fa_sync_devis_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só age em FA (document_reference começando com 'FA') e quando ficou 'pago'
  IF NEW.document_reference IS NOT NULL
     AND NEW.document_reference ~* '^FA'
     AND NEW.payment_status = 'pago'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  THEN
    UPDATE public.devis
       SET status = 'entrada_recebida',
           updated_at = now()
     WHERE devis_number = NEW.document_reference
       AND is_fa = true
       AND status <> 'entrada_recebida';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fa_sync_devis_on_payment ON public.financial_entries;
CREATE TRIGGER trg_fa_sync_devis_on_payment
AFTER INSERT OR UPDATE OF payment_status ON public.financial_entries
FOR EACH ROW
EXECUTE FUNCTION public.fa_sync_devis_on_payment();

-- Backfill: FAs já totalmente pagas devem refletir entrada_recebida
UPDATE public.devis d
   SET status = 'entrada_recebida', updated_at = now()
  FROM public.financial_entries fe
 WHERE d.is_fa = true
   AND d.devis_number = fe.document_reference
   AND fe.payment_status = 'pago'
   AND d.status <> 'entrada_recebida';

-- Registrar no changelog
SELECT public.log_change(
  'ajuste',
  'Status da FA no Comercial agora muda para "Entrada recebida" automaticamente quando a cobrança é paga em Contas a Receber.'
);