## Objetivo
Transformar a entrada do módulo **Financeiro** em uma tela com 4 cards grandes (estilo /hub), e mover a "Central Financeira" atual para uma sub-rota.

## Nova estrutura de rotas

```text
/financeiro                  → NOVO hub com 4 cards
/financeiro/central          → tela atual (sem alteração)
/financeiro/contas-a-receber → ContasTable kind="receber" + Voltar
/financeiro/contas-a-pagar   → ContasTable kind="pagar" + Voltar
/financeiro/rapport          → Placeholder "Em breve"
```

## Passos

1. **Renomear** `src/routes/_authenticated/financeiro.tsx` → `src/routes/_authenticated/financeiro.central.tsx` e atualizar `createFileRoute("/_authenticated/financeiro/central")`. Conteúdo permanece idêntico.

2. **Criar** `src/routes/_authenticated/financeiro.tsx` (novo hub):
   - Mesmo padrão visual do `/hub` (cards com gradiente, ícone, título, descrição, hover).
   - 4 cards:
     - **Central Financeira** (`Wallet`, gradiente azul) → `/financeiro/central`
     - **Contas a Receber** (`ArrowDownCircle`, verde) → `/financeiro/contas-a-receber`
     - **Contas a Pagar** (`ArrowUpCircle`, vermelho/laranja) → `/financeiro/contas-a-pagar`
     - **Rapport** (`BarChart3`, roxo) → `/financeiro/rapport`
   - Cabeçalho "Financeiro" + breve subtítulo.

3. **Criar** `src/routes/_authenticated/financeiro.contas-a-receber.tsx`:
   - Header com botão "Voltar" (→ `/financeiro`) e título.
   - Renderiza `<ContasTable kind="receber" />`.

4. **Criar** `src/routes/_authenticated/financeiro.contas-a-pagar.tsx`:
   - Mesmo padrão, `<ContasTable kind="pagar" />`.

5. **Criar** `src/routes/_authenticated/financeiro.rapport.tsx`:
   - Header com Voltar + título.
   - Card central com mensagem "Em breve — relatórios financeiros em construção".

6. **Sidebar/Acesso**: o item "Financeiro" continua apontando para `/financeiro` (agora o hub). `ROUTE_ACCESS` em `src/lib/access.ts` já cobre `/financeiro` por prefixo, então as sub-rotas herdam a permissão `financeiro` automaticamente — sem alteração necessária.

## Não muda
- Conteúdo da Central Financeira (abas, lançamentos, conciliação, KPIs).
- `ContasTable`, permissões, schema, edge functions.
- Layout/Sidebar/AuthGuard.
