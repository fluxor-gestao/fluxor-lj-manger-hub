-- Desativa RLS para permitir a limpeza e inserção via script de serviço
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;

-- Remove todos os clientes para evitar duplicatas e inconsistências na nova carga
-- Apenas se não houver registros vinculados em outras tabelas (foreign keys)
-- Se houver, o erro nos avisará e poderemos tratar apenas os importados.
DELETE FROM public.clients;
