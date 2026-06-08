## Objetivo

No `ProcessoDetailSheet` (drawer aberto em `/operacao`):

1. Prefixar o título com o código do Devis vinculado (ex.: `AM2026001 — Due Diligence...`).
2. Substituir o badge de status operacional sublinhado por um badge de **status financeiro do pagamento do Devis** (pago / parcial / pendente / sem cobrança).

## Contexto técnico

- `services.devis_id` → `devis.id`. O código fica em `devis.devis_number`.
- Cobranças do devis ficam em `financial_entries` com `document_reference = devis.id::text` (ver migration `20260513205723…`). O pagamento é refletido em `financial_entries.payment_status` (`pago` / `parcial` / `pendente`).
- Hoje a query de `operacao.tsx` (`useQuery operacao-services`) **não** traz `devis`. Precisamos estender o `select` para incluir `devis:devis(id, devis_number)`.

## Mudanças

### 1. `src/components/operacao/status.ts`
Estender `ServiceLike` com:
```ts
devis_id?: string | null;
devis?: { id: string; devis_number: string | null } | null;
```

### 2. `src/routes/_authenticated/operacao.tsx`
- Atualizar os dois selects (com e sem fallback) para incluir `devis_id, devis:devis(id, devis_number)`.

### 3. `src/components/operacao/ProcessoDetailSheet.tsx`
- **Título**: se `service.devis?.devis_number` existir, prefixar: `{devis_number} — {title}`. Caso contrário, manter `title`.
- **Badge financeiro** (substitui o atual `STATUS_BADGE[service.status]` no header):
  - Adicionar `useQuery` (apenas quando `open && service.devis_id`) que busca em `financial_entries` os lançamentos com `document_reference = service.devis_id` (campos: `amount_in, paid_amount, payment_status, open_amount`).
  - Derivar um `paymentStatus` agregado:
    - sem registros → "Sem cobrança" (cinza)
    - todos `pago` → "Pago" (verde)
    - algum `parcial` ou soma de `paid_amount > 0` com saldo > 0 → "Pagamento parcial" (âmbar)
    - todos `pendente` → "Aguardando pagamento" (laranja)
  - Renderizar badge no lugar do badge operacional, com texto e tooltip (valor pago / total). O Select de alteração de status operacional permanece (mudança apenas visual no badge sublinhado).
- Atualizar também `SheetDescription` para incluir o `devis_number` quando existir (no lugar do hash de 8 chars), mantendo o `client.name`.

### 4. (Opcional, fora de escopo desta etapa)
Não alterar a lista/kanban — apenas o detalhe, conforme o print.

## Restrições

- Sem novas tabelas, sem migrations.
- Sem mexer em Financeiro/Comercial/BI.
- Sem alterar o controle de status operacional (apenas a apresentação do badge no header).
