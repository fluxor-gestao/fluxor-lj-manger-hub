
CREATE OR REPLACE FUNCTION public.cleanup_fa_financial_on_service_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_fa = true AND OLD.fa_number IS NOT NULL THEN
    DELETE FROM public.financial_entries
    WHERE document_reference = OLD.fa_number
      AND COALESCE(paid_amount, 0) = 0
      AND COALESCE(payment_status, 'aberto') = 'aberto'
      AND COALESCE(conciliation_status, 'pendente') = 'pendente';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_fa_financial_on_service_delete ON public.services;
CREATE TRIGGER trg_cleanup_fa_financial_on_service_delete
BEFORE DELETE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_fa_financial_on_service_delete();
