
-- Track financial entries auto-created by the conciliation flow
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS created_via_conciliation boolean NOT NULL DEFAULT false;

-- Backfill: mark obvious "Transferência interna — ..." entries created by markAsTransfer
UPDATE public.financial_entries
   SET created_via_conciliation = true
 WHERE entry_type = 'transferencia'
   AND source_type = 'manual'
   AND movement_description LIKE 'Transferência interna —%';

-- Backfill: mark entries that ever had a payment tied to a bank statement (lançar e conciliar)
UPDATE public.financial_entries fe
   SET created_via_conciliation = true
 WHERE source_type = 'manual'
   AND document_reference IS NULL
   AND EXISTS (
     SELECT 1 FROM public.financial_payments fp
      WHERE fp.financial_entry_id = fe.id
        AND fp.bank_statement_entry_id IS NOT NULL
   );

-- Cleanup pass: delete auto-created entries that no longer have any matches or payments
-- (these are orphans from previously-undone conciliations / deleted statements)
WITH orphans AS (
  SELECT fe.id
    FROM public.financial_entries fe
   WHERE fe.created_via_conciliation = true
     AND NOT EXISTS (SELECT 1 FROM public.conciliation_matches cm WHERE cm.financial_entry_id = fe.id)
     AND NOT EXISTS (SELECT 1 FROM public.financial_payments fp WHERE fp.financial_entry_id = fe.id)
)
DELETE FROM public.financial_entries WHERE id IN (SELECT id FROM orphans);
