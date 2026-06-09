-- 1. Garantir que services (Operação) sejam excluídos automaticamente quando um Devis for removido
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'devis_id') THEN
        -- Tenta remover a constraint antiga se existir para recriar com CASCADE
        ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_devis_id_fkey;
        ALTER TABLE public.services 
        ADD CONSTRAINT services_devis_id_fkey 
        FOREIGN KEY (devis_id) REFERENCES public.devis(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Limpar registros financeiros órfãos e garantir integridade futura
-- Como financial_entries usa document_reference (texto/uuid) sem FK rígida às vezes,
-- vamos criar um trigger para garantir que ao deletar um Devis, os registros financeiros vinculados sumam.

CREATE OR REPLACE FUNCTION public.handle_devis_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove lançamentos financeiros vinculados ao Devis pelo document_reference
    DELETE FROM public.financial_entries 
    WHERE document_reference = OLD.id::text;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger se já existir e recria
DROP TRIGGER IF EXISTS on_devis_deleted ON public.devis;
CREATE TRIGGER on_devis_deleted
    BEFORE DELETE ON public.devis
    FOR EACH ROW EXECUTE FUNCTION public.handle_devis_deletion();

-- 3. Limpeza retroativa: remover registros financeiros que referenciam Devis que não existem mais
DELETE FROM public.financial_entries
WHERE document_reference IS NOT NULL 
  AND document_reference ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' -- Formato UUID
  AND NOT EXISTS (
    SELECT 1 FROM public.devis WHERE id = document_reference::uuid
  );
