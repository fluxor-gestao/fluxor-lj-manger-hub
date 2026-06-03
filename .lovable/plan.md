# Migration incremental — Financeiro & Conciliação

Adiciona tabelas de cadastro (fornecedores, categorias, centros de custo, formas de pagamento) e rateio (allocations), além de novas colunas em `financial_entries` para classificação completa. **Nada existente é removido ou renomeado** — todas as novas colunas são `NULL`able, então as telas atuais continuam funcionando sem alteração.

## 1. Novas tabelas

Padrão: `id uuid PK`, `created_at/updated_at`, RLS habilitado, trigger `update_updated_at_column`, GRANTs para `authenticated` e `service_role`. Política única: `admin` ou `financeiro` podem gerenciar; demais usuários autenticados podem SELECT (para popular selects nas telas).

### `suppliers`
- `name text not null`
- `document text` (CNPJ/CPF, único quando preenchido)
- `email text`, `phone text`
- `notes text`
- `active boolean default true`
- índice: `(active)`, `lower(name)`

### `financial_categories`
- `name text not null`
- `kind text not null check (kind in ('receita','despesa','ambos'))`
- `parent_id uuid references financial_categories(id)` (suporta subcategorias)
- `active boolean default true`
- índice: `(kind, active)`, `(parent_id)`

### `cost_centers`
- `name text not null`
- `code text` (curto/identificador)
- `business_unit text` (opcional, alinha com o `business_unit` já usado em `financial_entries`)
- `active boolean default true`
- índice: `(business_unit, active)`

### `payment_methods`
- `name text not null` (ex.: "Pix", "Boleto", "Cartão", "TED")
- `kind text` (livre, ex.: "pix", "boleto", "cartao", "transferencia", "dinheiro")
- `active boolean default true`

### `entry_allocations` (rateio de um lançamento entre categorias/centros)
- `entry_id uuid not null references financial_entries(id) on delete cascade`
- `category_id uuid references financial_categories(id)`
- `cost_center_id uuid references cost_centers(id)`
- `amount numeric(14,2) not null`
- `percent numeric(7,4)` (opcional)
- `notes text`
- índices: `(entry_id)`, `(category_id)`, `(cost_center_id)`
- RLS: mesma regra de `financial_entries` (admin/financeiro gerenciam).

## 2. Novas colunas em `financial_entries`

Todas `NULL`able, sem default disruptivo:

| Coluna | Tipo | Observação |
|---|---|---|
| `supplier_id` | `uuid → suppliers(id)` | FK ON DELETE SET NULL |
| `client_id` | `uuid → clients(id)` | FK ON DELETE SET NULL |
| `category_id` | `uuid → financial_categories(id)` | classificação direta (quando não há rateio) |
| `cost_center_id` | `uuid → cost_centers(id)` | idem |
| `reference_code` | `text` | nº NF / nº boleto / referência externa |
| `competence_date` | `date` | competência granular (mantém `competence_month` text por compatibilidade) |
| `due_date` | `date` | vencimento |
| `payment_method_id` | `uuid → payment_methods(id)` | |
| `payment_account_id` | `uuid → bank_accounts(id)` | conta efetivamente usada no pagamento (≠ `bank_account_id` do extrato) |
| `installment_number` | `int` | parcela atual |
| `installment_total` | `int` | total de parcelas |
| `paid_at` | `timestamptz` | data/hora do pagamento |
| `paid_amount` | `numeric(14,2)` | valor pago |
| `open_amount` | `numeric(14,2)` | saldo em aberto |
| `payment_status` | `text` | `aberto` \| `parcial` \| `pago` \| `vencido` \| `cancelado` (CHECK) |
| `notes` | `text` | observações livres |

Sem trigger automático recalculando `open_amount`/`payment_status` nesta migration — manter cálculo na camada de aplicação para não interferir nos triggers já existentes (`fx_recompute_total_brl`, etc.). Pode ser adicionado em migration futura quando a UI estiver definida.

## 3. Índices em `financial_entries`

Adicionar (apenas para as novas colunas mais consultadas):
- `(supplier_id)`, `(client_id)`, `(category_id)`, `(cost_center_id)`
- `(payment_method_id)`, `(payment_account_id)`
- `(due_date)` parcial `WHERE payment_status IN ('aberto','parcial','vencido')`
- `(payment_status)`
- `(competence_date)`

## 4. RLS — padrão das novas tabelas

```sql
-- exemplo para suppliers (idem para as outras)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin/financeiro manage suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'financeiro'));

CREATE POLICY "authenticated read suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (true);
```

GRANTs:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tbl> TO authenticated;
GRANT ALL ON public.<tbl> TO service_role;
```

`entry_allocations` usa apenas a política admin/financeiro (sem leitura ampla), porque é detalhe contábil de um lançamento.

`financial_entries` já tem RLS adequada (admin/financeiro manage) — as novas colunas herdam.

## 5. Compatibilidade

- Nenhuma coluna existente alterada/removida.
- `competence_month` (text) **permanece** ao lado do novo `competence_date` (date). UI atual segue funcionando.
- Funções `financeiro_summary` / `financeiro_analitico` não dependem das novas colunas → seguem operando.
- Triggers existentes (`fx_recompute_total_brl`, `update_updated_at_column`) não são tocados.
- Tipos do Supabase (`src/integrations/supabase/types.ts`) são regenerados automaticamente após aprovar a migration — nenhuma edição manual desse arquivo.

## 6. Ordem de execução na migration (uma só)

1. `CREATE TABLE` das 5 novas tabelas + GRANTs + RLS + policies + triggers de `updated_at`.
2. `ALTER TABLE public.financial_entries ADD COLUMN ...` para as 16 novas colunas (todas nullable, sem default exceto onde indicado).
3. CHECK constraint em `payment_status`.
4. Criação dos índices.

## 7. Pós-migration (fora desta migration)

Estas mudanças **habilitam** o módulo, mas não acoplam UI:
- Telas de cadastro (Fornecedores, Categorias, Centros de Custo, Formas de Pagamento) — escopo futuro.
- Formulário de lançamento financeiro estendido — escopo futuro.
- Tela de conciliação consumindo `entry_allocations` — escopo futuro.

Após aprovação da migration, eu reviso `types.ts` (regenerado pelo Supabase) e confirmo que não houve regressão nas telas atuais.
