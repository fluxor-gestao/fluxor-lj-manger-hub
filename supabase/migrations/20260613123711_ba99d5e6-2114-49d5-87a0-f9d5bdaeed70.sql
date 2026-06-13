-- Add deduplication support to bank statement uploads
ALTER TABLE public.bank_statement_entries
  ADD COLUMN IF NOT EXISTS dedup_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS bank_statement_entries_dedup_hash_uniq
  ON public.bank_statement_entries (dedup_hash)
  WHERE dedup_hash IS NOT NULL;

ALTER TABLE public.import_batches
  ADD COLUMN IF NOT EXISTS duplicate_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS file_hash text,
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id);