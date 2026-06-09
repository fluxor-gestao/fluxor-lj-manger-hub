-- 1. Tratar e-mails que contêm caracteres especiais < > " '
UPDATE public.clients
SET email = REGEXP_REPLACE(email, '[<>"''\s]', '', 'g')
WHERE email ~ '[<>"''\s]';

-- 2. Tratar e-mails que contêm múltiplos endereços (separados por vírgula ou ponto e vírgula)
-- Pegando apenas o primeiro endereço válido
UPDATE public.clients
SET email = SPLIT_PART(email, ',', 1)
WHERE email LIKE '%,%';

UPDATE public.clients
SET email = SPLIT_PART(email, ';', 1)
WHERE email LIKE '%;%';

-- 3. Garantir que não restou espaços em branco
UPDATE public.clients
SET email = TRIM(email)
WHERE email LIKE ' %' OR email LIKE '% ';
