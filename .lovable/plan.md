# Corrigir link de aceite da proposta

## Problema
Em `src/components/devis/SendDevisDialog.tsx` (linha 47):
```ts
const acceptUrl = `${window.location.origin}/proposta/aceite/${devis?.accept_token}`;
```
Quando o envio acontece a partir do preview do Lovable, `window.location.origin` é `https://id-preview--...lovableproject.com`, um host privado que exige login no Lovable. O cliente final clica no link e cai na tela "Access denied".

## Solução
Usar sempre o domínio público da aplicação para montar o link de aceite, com a seguinte ordem de prioridade:

1. `import.meta.env.VITE_PUBLIC_SITE_URL` (se definida)
2. Fallback fixo: `https://ljmanager.fluxorbi.com` (domínio custom já publicado)
3. Último recurso (só em dev local sem variável): `window.location.origin`

## Mudanças

**1. `.env`** — adicionar:
```
VITE_PUBLIC_SITE_URL=https://ljmanager.fluxorbi.com
```

**2. `src/components/devis/SendDevisDialog.tsx`** — substituir a linha do `acceptUrl` por:
```ts
const publicBase =
  import.meta.env.VITE_PUBLIC_SITE_URL ||
  "https://ljmanager.fluxorbi.com";
const acceptUrl = `${publicBase}/proposta/aceite/${devis?.accept_token}`;
```

Nenhuma outra mudança necessária — a rota `/proposta/aceite/$token` é pública e a edge function `accept-devis-proposal` já aceita chamadas anônimas com a anon key.

## Validação
- Reenviar uma proposta de teste e conferir que o link no e-mail começa com `https://ljmanager.fluxorbi.com/proposta/aceite/...` e abre direto a tela de aceite (sem login Lovable).
