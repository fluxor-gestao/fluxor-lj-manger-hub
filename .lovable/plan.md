## Problema

Hoje `src/routes/_authenticated/financeiro.tsx` é simultaneamente:
- a página com os 4 cards (hub), e
- o **pai** de `financeiro.central`, `financeiro.contas-a-receber`, `financeiro.contas-a-pagar`, `financeiro.rapport`.

No TanStack Router, quando um arquivo de rota tem filhos com o mesmo prefixo (`financeiro.*`), ele vira **layout**. O componente do layout precisa renderizar `<Outlet />` para os filhos aparecerem. Como o nosso renderiza os cards, ao clicar em "Central Financeira" a URL muda para `/financeiro/central` mas a tela continua mostrando os cards — efeito: "nada navega".

## Correção

1. **Renomear** `src/routes/_authenticated/financeiro.tsx` → `src/routes/_authenticated/financeiro.index.tsx`
   - Atualizar `createFileRoute("/_authenticated/financeiro/")` (rota índice).
   - Conteúdo (os 4 cards) permanece igual.

2. **Criar** novo `src/routes/_authenticated/financeiro.tsx` como **layout puro**:
   ```tsx
   import { createFileRoute, Outlet } from "@tanstack/react-router";
   export const Route = createFileRoute("/_authenticated/financeiro")({
     component: () => <Outlet />,
   });
   ```

3. Nenhuma outra alteração: sub-rotas, permissões, sidebar e `ContasTable` ficam como estão. O `routeTree.gen.ts` é regenerado automaticamente.

## Resultado

- `/financeiro` → mostra os 4 cards (hub via index).
- `/financeiro/central` → renderiza a Central Financeira dentro do `<Outlet />`.
- `/financeiro/contas-a-receber`, `/contas-a-pagar`, `/rapport` → funcionam normalmente.
