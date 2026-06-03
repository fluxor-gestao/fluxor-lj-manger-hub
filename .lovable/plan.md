# Pagamento parcial na conciliação

## 1. Migration: tabela `financial_payments`

Criar tabela para histórico imutável de baixas:

- `id uuid pk default gen_random_uuid()`
- `financial_entry_id uuid not null references financial_entries(id) on delete restrict`
- `bank_statement_entry_id uuid references bank_statement_entries(id) on delete set null`
- `conciliation_match_id uuid references conciliation_matches(id) on delete set null` (rastreabilidade)
- `amount numeric(14,2) not null check (amount > 0)`
- `paid_at date not null default current_date`
- `payment_method_id uuid references payment_methods(id)`
- `bank_account_id uuid references bank_accounts(id)`
- `notes text`
- `created_by uuid` (auth.uid)
- `created_at timestamptz default now()`

Índices: `(financial_entry_id)`, `(bank_statement_entry_id)`, `(paid_at)`.

GRANTs: `SELECT, INSERT, UPDATE, DELETE` para `authenticated`; `ALL` para `service_role`. RLS habilitada com policy alinhada ao padrão atual (admin + financeiro via `has_role`, igual a `financial_entries`).

Nada é apagado: sem trigger de delete, sem cascade destrutivo.

## 2. Lógica nova em `conciliatePair` (`src/routes/_authenticated/conciliacao.tsx`)

Substitui o `feUpdate` simples (apenas `conciliation_status`) por fluxo baseado em `open_amount`:

```text
stmtAmt   = |stmt.amount|
openAmt   = fe.open_amount ?? (fe.amount_in|amount_out) - (fe.paid_amount ?? 0)
paidPrev  = fe.paid_amount ?? 0

if stmtAmt == openAmt (tol 0.01):
    payment_status = 'pago'
    paid_amount    = paidPrev + stmtAmt   (= valor total da parcela)
    open_amount    = 0
elif stmtAmt < openAmt:
    payment_status = 'parcial'
    paid_amount    = paidPrev + stmtAmt
    open_amount    = openAmt - stmtAmt
else (stmtAmt > openAmt):
    confirm("Valor do banco (X) é maior que o saldo em aberto (Y). Registrar como pago e gerar sobra?")
    se confirmar:
        payment_status = 'pago'
        paid_amount    = paidPrev + openAmt   (limita ao saldo)
        open_amount    = 0
        // sobra fica registrada em financial_payments.notes = "excedente R$ ..."
    senão: throw
```

Após update do `financial_entries`, INSERT em `financial_payments` com `amount = min(stmtAmt, openAmt)` (ou `stmtAmt` quando igual), `bank_statement_entry_id = stmt.id`, `bank_account_id = stmt.bank_account_id`, `payment_method_id = fe.payment_method_id`, `paid_at = stmt.transaction_date`, `created_by = user.id`, `conciliation_match_id = matchId`.

`bank_statement_entries.conciliation_status` continua indo para `'conciliado'` (extrato é uma linha = uma baixa). A divergência cambial / direção oposta atual é preservada antes desse bloco.

## 3. `undoMatch` — preservar histórico

Hoje deleta o `conciliation_matches` e zera status. Novo comportamento:

- Marca match como `rejeitado` (não deleta) **ou** deleta apenas o match, mas **mantém** linhas de `financial_payments` intactas.
- Reverte a baixa recalculando a partir do histórico: busca `sum(amount)` em `financial_payments` para o `financial_entry_id` **excluindo** o pagamento associado a esse match; recalcula `paid_amount`, `open_amount`, `payment_status` (`pago` / `parcial` / `aberto` / `vencido`) e atualiza `financial_entries`.
- Remove apenas o registro de `financial_payments` daquele match (não é "apagar histórico anterior" — é cancelar a baixa específica) **ou**, alternativamente, mantém com `notes = 'estornado'`. **Decisão proposta:** delete somente a linha vinculada ao match desfeito; demais baixas permanecem.
- `bank_statement_entries` volta para `pendente`.

## 4. UI

- Botão "Conciliar" continua igual; o `window.confirm` extra aparece só no caso `stmtAmt > openAmt`.
- Toast diferenciado: `"Baixa parcial registrada — saldo: R$ X"` quando `payment_status = 'parcial'`.
- Sem nova tela de histórico nesta entrega (fora de escopo).

## 5. Compatibilidade

- `conciliation_status = 'conciliado'` continua sendo escrito para não quebrar filtros/relatórios existentes.
- Campos `payment_status`, `paid_amount`, `open_amount` já existem em `financial_entries` (migration anterior).
- Lançamentos antigos sem `open_amount` definido caem no fallback `amount_in|amount_out - paid_amount`.

## Fora de escopo

- Tela de listagem/edição de `financial_payments`.
- Estorno em massa.
- Trigger SQL que mantém `paid_amount/open_amount` sincronizados (mantemos cálculo no client, igual ao `NovoLancamentoDialog`).

## Arquivos

- **Nova migration**: `financial_payments` + GRANTs + RLS + índices.
- **Editar**: `src/routes/_authenticated/conciliacao.tsx` (`conciliatePair`, `undoMatch`).
- Types do Supabase regenerados após a migration.
