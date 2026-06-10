-- Ajuste para deletar pagamentos quando o lançamento financeiro for excluído
ALTER TABLE public.financial_payments 
DROP CONSTRAINT financial_payments_financial_entry_id_fkey,
ADD CONSTRAINT financial_payments_financial_entry_id_fkey 
    FOREIGN KEY (financial_entry_id) 
    REFERENCES public.financial_entries(id) 
    ON DELETE CASCADE;

-- Ajuste para deletar pagamentos quando a entrada do extrato (Conciliação) for excluída
ALTER TABLE public.financial_payments 
DROP CONSTRAINT financial_payments_bank_statement_entry_id_fkey,
ADD CONSTRAINT financial_payments_bank_statement_entry_id_fkey 
    FOREIGN KEY (bank_statement_entry_id) 
    REFERENCES public.bank_statement_entries(id) 
    ON DELETE CASCADE;