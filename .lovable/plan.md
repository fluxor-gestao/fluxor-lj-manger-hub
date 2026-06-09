## Diagnóstico

O login no Supabase está funcionando — os logs de auth confirmam `Login` bem-sucedido para `gestao@fluxorbi.com` às 13:31:44. O problema é no front: após o `window.location.assign("/hub")`, o navegador tenta carregar o módulo dinâmico do TanStack Start e recebe:

```
Failed to fetch dynamically imported module: /@id/virtual:tanstack-start-client-entry
```

Isso veio de um crash de SSR anterior (resíduo dos erros de JSX em `comercial.tsx` corrigidos nas últimas iterações). O Vite ficou com cache inválido e o overlay de erro bloqueou a navegação. O `tsc --noEmit` atual passa sem erros e o dev server já reiniciou (`VITE v7.3.2 ready`), mas a aba do usuário ainda está presa no estado antigo.

## Ação

1. Forçar restart limpo do dev server para garantir que nenhum módulo SSR esteja em cache stale.
2. Pedir ao usuário um hard refresh (Ctrl+Shift+R) na aba `/auth` para descartar o chunk antigo `virtual:tanstack-start-client-entry` em cache no navegador.
3. Validar fluxo: login → redirecionamento para `/hub` → render do `AppLayout` com o `CompanySelector`.

Nenhuma alteração de código é necessária — o código está válido. É somente limpar caches.

## Fora de escopo

Não vou mexer em regras de auth, no `AuthContext`, no `_authenticated/route.tsx` (gerenciado pela integração) nem nos componentes de Devis/Empresa criados nas etapas anteriores.