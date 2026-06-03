## Plano

### 1. Sobre `SUPABASE_SERVICE_ROLE_KEY`
O prefixo `SUPABASE_` é **reservado pela Lovable Cloud** — não posso criar/adicionar essa secret manualmente via `add_secret`. Ela já é **injetada automaticamente no runtime server** pela conexão Supabase ativa (`uxwdzcjhrhlugrjgpkcr`), junto de `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Vou validar via `fetch_secrets` que aparece como managed, e o `client.server.ts` lê via `process.env.SUPABASE_SERVICE_ROLE_KEY` normalmente.

Se por algum motivo não estiver disponível no runtime, abro instrução para você ativá-la em Project Settings → Secrets (managed).

### 2. Correção cirúrgica em `src/integrations/supabase/client.ts`
Detectar ambiente e desabilitar persistência no SSR:

```ts
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: isBrowser ? localStorage : undefined,
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
  }
});
```

- Browser → comportamento atual preservado (persistSession + autoRefreshToken ativos, storage = localStorage).
- Server (SSR/worker) → storage `undefined`, persistSession `false`, autoRefreshToken `false`. GoTrue não toca `localStorage`.

### 3. Validação pós-build
1. `fetch_secrets` → confirmar `SUPABASE_SERVICE_ROLE_KEY` listado como managed.
2. `invoke-server-function` GET `/auth` → esperar 200.
3. `invoke-server-function` GET `/api/public/bi-kpis-comercial` → esperar 200.
4. `server-function-logs` filtrando `localStorage` → esperar zero ocorrências.

### Escopo / restrições
- Apenas `src/integrations/supabase/client.ts` é editado.
- Nada de schema, migrations, RLS, regras de negócio, layout ou outros arquivos.
