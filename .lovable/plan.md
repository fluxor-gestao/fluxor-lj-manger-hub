# Plano de importação — ljmanger-fluxorbi-com → Supabase Pro `uxwdzcjhrhlugrjgpkcr`

## Premissas confirmadas
- Você fornecerá: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (anon) e `SUPABASE_SERVICE_ROLE_KEY` do projeto `uxwdzcjhrhlugrjgpkcr`.
- Schema, RLS, policies, triggers, functions, bucket `devis-pdfs` e extensões já estão aplicados manualmente no Supabase Pro. **Nenhuma migration será executada.**
- Edge Functions já existem no Supabase (deploy é gerenciado por você fora do Lovable). Os fontes em `supabase/functions/` serão mantidos no repo apenas como referência.

## Passos

### 1. Importar o código (1:1, sem alterações)
- Baixar o ZIP de `main` do GitHub e extrair sobre `/dev-server/`, preservando:
  - `src/` (todas as rotas, componentes, hooks, integrations, lib, contexts, content, assets)
  - `public/`, `scripts/`, `supabase/` (functions + migrations + config.toml), `migrations-export/`
  - `components.json`, `tsconfig.json`, `vite.config.ts`, `wrangler.jsonc`, `eslint.config.js`, `bun.lock`, `package.json`
- Remover o template placeholder atual (`src/routes/index.tsx` placeholder, `src/routeTree.gen.ts` antigo — será regenerado pelo plugin do TanStack).
- Garantir que `.git`, se existir no ZIP, seja descartado antes de copiar.
- Rodar `bun install` para sincronizar dependências do `package.json` importado.

### 2. Trocar referências do projeto antigo → novo (2 arquivos)
- **`.env`** — substituir os 3 valores que apontam para `phmqxmwaoonbibgvbumq`:
  - `SUPABASE_URL="https://uxwdzcjhrhlugrjgpkcr.supabase.co"`
  - `VITE_SUPABASE_URL="https://uxwdzcjhrhlugrjgpkcr.supabase.co"`
  - `VITE_SUPABASE_PROJECT_ID="uxwdzcjhrhlugrjgpkcr"`
- **`supabase/config.toml`** — `project_id = "uxwdzcjhrhlugrjgpkcr"` (não dispara nada; é só metadado para a Supabase CLI local).

### 3. Cadastrar secrets de runtime (via `add_secret`)
Necessárias para SSR/server functions/admin (o `.env` só serve para o build do Vite; em runtime no Worker são os secrets que valem):
- `VITE_SUPABASE_URL` = `https://uxwdzcjhrhlugrjgpkcr.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = (anon key fornecida por você)
- `VITE_SUPABASE_PROJECT_ID` = `uxwdzcjhrhlugrjgpkcr`
- `SUPABASE_URL` = `https://uxwdzcjhrhlugrjgpkcr.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` = (anon key)
- `SUPABASE_SERVICE_ROLE_KEY` = (service role fornecida por você)
- `SUPABASE_PROJECT_ID` = `uxwdzcjhrhlugrjgpkcr`

Você receberá um formulário seguro para colar a anon e a service role; nenhuma chave será gravada em código.

### 4. Validações (sem alterar código de negócio)
- Build do projeto (TanStack/Vite/Cloudflare plugin) executa sem erro.
- `supabase.from(...)` aponta para `uxwdzcjhrhlugrjgpkcr` (validado pelo client.ts lendo env).
- Autenticação: tela `/auth` carrega; `_authenticated/` redireciona se não logado; `auth-middleware` injeta o user nos server functions; `auth-attacher` em `src/start.ts` continua anexando o bearer.
- Smoke-test de leitura via preview: `profiles`, `user_roles`, `clients`, `devis`, `services`, `financial_entries`, storage `devis-pdfs`.
- Rotas públicas de BI (`/api/public/bi-*`) respondem.
- Aceite de devis (`/proposta/aceite/$token`) carrega.
- Log/network: sem chamadas residuais para `phmqxmwaoonbibgvbumq`.

### 5. Itens que NÃO serão tocados
Comercial, Financeiro, Operação, Gestão, BI, sistema de usuários/permissões, geração e aceite de devis, criação automática de serviços e cobranças, conciliação financeira, geração de PDFs, fluxos de e-mail, dashboards, RPCs, triggers, server functions, integrações entre módulos, navegação, layout, componentes UI.

## Detalhes técnicos
- O `client.ts` e `client.server.ts` já são genéricos (leem env). Não há `createClient(url, key)` hardcoded em nenhum lugar do `src/` — confirmado por busca regex.
- TanStack Start no template Lovable usa Cloudflare Worker para SSR; os secrets de runtime são injetados via plataforma, por isso o passo 3 é obrigatório mesmo com `.env` correto.
- `bun.lock` será preservado do repo importado para garantir mesmas versões.
- `supabase/functions/*` e `supabase/migrations/*` ficam no repo apenas como referência — não são executados pelo Lovable (você gerencia deploy/migrations diretamente no Supabase Pro).
- Se algum componente fizer `import` de algo que não existia no template antigo, o `bun install` baseado no `package.json` importado resolve.

## Riscos / pontos de atenção
- Se a anon key ou service role estiverem trocadas, `client.ts` lança erro claro ("Missing Supabase environment variable(s)") e nenhuma rota carrega — fácil de detectar.
- Se o bucket `devis-pdfs` não estiver com policy pública/assinada como no projeto antigo, geração/leitura de PDFs falhará — fora do escopo deste plano (você confirmou que já foi aplicado).
- Edge functions (`generate-devis-proposal`, `send-devis-proposal`, `accept-devis-proposal`, `translate-devis`, `manage-users`, `analyze-meeting-report`, `parse-bank-statement-pdf`) precisam estar deployadas no Supabase Pro novo — também fora do escopo do Lovable.

## Entregável
Sistema rodando no preview do Lovable, visual e funcionalmente idêntico ao repositório de origem, conectado exclusivamente a `uxwdzcjhrhlugrjgpkcr`.
