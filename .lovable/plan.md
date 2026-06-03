
# Validação completa — Supabase `uxwdzcjhrhlugrjgpkcr`

Objetivo: rodar uma bateria de verificações somente-leitura + testes mínimos criados/removidos, sem mexer em schema, migrations, layout ou regras de negócio. Apenas corrigir erros de integração se aparecerem.

## Como vou executar (10 seções)

### 1. Infra / Supabase
- Conferir `.env`, `client.ts`, `client.server.ts`, `auth-middleware.ts` — project_ref, URL, publishable e service role.
- `fetch_secrets` para confirmar `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
- `supabase--read_query` listando `pg_tables` com `rowsecurity=true` para confirmar RLS.
- Listar bucket `devis-pdfs` via query em `storage.buckets`.

### 2. Auth
- Verificar `AuthContext`, `_authenticated/route.tsx`, fluxo `/auth`.
- Query: `auth.users` × `profiles` × `user_roles` (admin presente).
- Validar `attachSupabaseAuth` registrado em `start.ts` (já confirmado).

### 3. Módulos
- Abrir cada rota via browser tool (Hub, Comercial, Financeiro, Operação, Gestão, BI) logado como `gestao@fluxorbi.com` (admin).
- Capturar console + network para erros.

### 4. Fluxo Comercial
- Listar `clients`, `devis` via SQL.
- Criar 1 client teste + 1 devis teste via SQL (`INSERT`) marcado com sufixo `__qa_test`.
- Atualizar status, simular aceite (set `accepted_at`) — observar triggers `devis_accepted_create_service` e `trg_devis_accepted_charge`.
- Abrir PDF do devis no preview (rota `/comercial/devis/$id`).
- Remover registros teste no final.

### 5. Automações
- Após aceite teste, confirmar:
  - novo `services` criado com `devis_id`
  - novo `financial_entries` 50%
  - `devis_number` gerado automaticamente
  - `updated_at` mudou ao update

### 6. Financeiro
- SELECTs em `financial_entries`, `bank_accounts`, `conciliation_matches`, `bank_statement_entries`.
- INSERT mínimo em `financial_entries` (qa_test) e DELETE.

### 7. RPCs/BI
- `supabase--read_query`:
  ```sql
  SELECT bi_kpis_comercial(NULL,NULL);
  SELECT bi_kpis_financeiro(NULL,NULL); -- se existir
  SELECT bi_kpis_operacao(NULL,NULL);
  SELECT financeiro_summary();
  SELECT * FROM financeiro_analitico() LIMIT 5;
  ```

### 8. Server functions / APIs
- `stack_modern--invoke-server-function` em `/api/public/bi-kpis-comercial`, `/bi-kpis-financeiro`, `/bi-kpis-operacao`, `/bi-comercial`, `/bi-financeiro`, `/bi-operacao` — verificar 200/401/403.
- Invocar uma serverFn protegida via browser logado e observar header `Authorization`.

### 9. Storage `devis-pdfs`
- Via service role: upload de arquivo `qa_test.txt`, gerar signed URL, baixar, deletar.
- Confirmar bucket privado.

### 10. Logs
- `code--read_console_logs` + `supabase--analytics_query` (auth + edge logs) buscando:
  - `localStorage is not defined`
  - `Missing Supabase environment`
  - HTTP 500 nas rotas principais
- Listar warnings relevantes.

## Entregável final
Relatório com:
- Tabela OK/Erro por item das 10 seções
- Evidências (query results, status HTTP, logs)
- Registros de teste criados (IDs)
- Confirmação de remoção
- Lista de correções de integração feitas (se houver) — apenas integração, sem tocar schema/regra/layout

## Confirmação necessária
Para executar, preciso:
1. Aprovar este plano (entro em build mode).
2. Permissões já habilitadas em Lovable Cloud: **Read database** e **Add data** = Always allow (para `supabase--read_query` e os INSERTs de teste). Caso contrário, eu paro e te aviso antes de cada operação.

Aprovar este plano para eu rodar.
