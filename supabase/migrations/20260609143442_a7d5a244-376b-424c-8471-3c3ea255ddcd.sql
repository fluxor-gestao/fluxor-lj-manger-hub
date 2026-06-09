ALTER TABLE public.services 
DROP CONSTRAINT IF EXISTS services_devis_id_fkey,
ADD CONSTRAINT services_devis_id_fkey 
    FOREIGN KEY (devis_id) 
    REFERENCES public.devis(id) 
    ON DELETE CASCADE;
