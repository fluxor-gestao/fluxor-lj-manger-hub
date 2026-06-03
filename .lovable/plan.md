# Plano — Formulário avançado de Novo Lançamento Financeiro

Substituir o diálogo simples atual (`src/routes/_authenticated/financeiro.tsx`, ~linhas 114–298 e 377–466) por um formulário com classificação completa, condição de pagamento e rateio. Tudo dentro do mesmo arquivo de rota; lógica do form extraída para um componente novo para não inflar a página.

## 1. Novo componente

`src/components/financeiro/NovoLancamentoDialog.tsx`

Props:
- `open`, `onOpenChange`
- `onCreated()` — callback para invalidar queries (`["financial-entries"]`)
- `bankAccounts` — reaproveita o que a tela já carrega

Estado interno gerenciado com `react-hook-form` + `zod` (já presentes no projeto). Schema valida: descrição obrigatória, valor > 0, data de competência obrigatória, parcelas ≥ 1, soma do rateio = 100% (ou = valor) quando ativo.

## 2. Layout do diálogo

Dialog largo (`max-w-3xl`), com 3 seções colapsáveis (sempre visíveis, separadas por título):

### Seção A — Informações do lançamento
- **Tipo** (`entry_type`): radio/segmented `receita | despesa | transferencia`
- **Fornecedor/Cliente**: Combobox condicional
  - `receita` → busca em `clients` → grava `client_id`
  - `despesa` → busca em `suppliers` → grava `supplier_id`
  - `transferencia` → oculto
- **Descrição** (`movement_description`)
- **Valor** (`CurrencyInputBRL`) — único campo de valor; mapeado para `amount_in`/`amount_out` conforme tipo
- **Data de competência** (`competence_date` date + `competence_month` derivado `YYYY-MM`)
- **Categoria** (`category_id`) — select de `financial_categories` filtrado por `kind` compatível com o tipo
- **Centro de custo** (`cost_center_id`) — select de `cost_centers`
- **Código de referência** (`reference_code`)
- **Unidade de negócio** (`business_unit`) — mantido
- **Switch "Habilitar rateio"** — quando ativo, esconde Categoria/Centro de custo no topo e mostra a Seção C

### Seção B — Condição de pagamento
- **Parcelamento**: `installment_total` (number, default 1) + indicador "Parcela atual" `installment_number` (default 1). Quando `> 1`, mostra hint "será criado 1 lançamento por parcela com vencimentos mensais a partir da data de vencimento informada"
- **Vencimento** (`due_date`)
- **Forma de pagamento** (`payment_method_id`) — select de `payment_methods`
- **Conta de pagamento** (`payment_account_id`) — select de `bank_accounts`
- **Pago?** Switch
  - quando ON: mostra `paid_at` (date, default hoje) e `paid_amount` (default = valor total da parcela)

### Seção C — Rateio (condicional)
Tabela editável com linhas `{ category_id, cost_center_id, percent, amount, notes? }`.
- Botão "+ Adicionar linha" e remoção por linha
- Edição em percent recalcula `amount = valor * percent/100`; edição em amount recalcula percent
- Rodapé mostra soma percent / soma valor com aviso visual se ≠ 100% / ≠ valor

## 3. Lógica ao salvar

Função única `handleSubmit` (mutation):

```
const totalAmount = Number(form.amount)                  // valor digitado
const installments = Math.max(1, form.installment_total)
const parcelaAmount = round2(totalAmount / installments)
```

Para cada parcela `i = 1..installments`:
1. **Calcular status/saldo da parcela**
   - se `pago == true` e `paid_amount >= parcelaAmount` → `payment_status='pago'`, `open_amount = 0`, `paid_amount = parcelaAmount`
   - se `pago == true` e `0 < paid_amount < parcelaAmount` → `'parcial'`, `open_amount = parcelaAmount - paid_amount`
   - se `pago == false` e `due_date < hoje` → `'vencido'`
   - senão → `'aberto'`
   - `conciliation_status`: `'conciliado'` quando `payment_status='pago'`, senão mantém `'pendente'` (compatível com telas atuais e com `financeiro_summary`)
2. **Insert em `financial_entries`** com todos os novos campos preenchidos (incluindo `installment_number=i`, `installment_total`, `due_date` = vencimento base + (i-1) meses, `amount_in/amount_out` mapeados pelo tipo, `source_type='manual'`, `user_id`). Retorna `id`.
3. Se **rateio ativo**: insert em `entry_allocations` (uma linha por linha do rateio) com `entry_id` recém-criado e `amount = linha.percent/100 * parcelaAmount` (recalculado por parcela para garantir consistência).

Tudo dentro de um `try`/`catch` simples; erros mostram `toast.error`. Sucesso: `toast.success`, fecha diálogo, reseta form, chama `onCreated()`.

## 4. Carregamento de selects

Hook único `useFinanceiroCatalogs()` em `src/hooks/useFinanceiroCatalogs.ts` que retorna `{ suppliers, clients, categories, costCenters, paymentMethods }`, cada um via `useQuery` com `staleTime` longo (5 min). Filtra `active=true`. Usa `supabase.from(...).select('id, name, kind?').order('name')`.

## 5. Compatibilidade

- `competence_month` (texto YYYY-MM) **continua sendo preenchido** (derivado de `competence_date`) → `financeiro_summary` e tela atual seguem funcionando.
- `entry_type` mantém os valores existentes (`receita | despesa | transferencia`).
- `source_type='manual'` mantido.
- Trigger `fx_recompute_total_brl` continua recalculando `total_brl`.
- Nenhuma alteração em listagem/filtros/RPCs — apenas o diálogo muda.

## 6. Pontos técnicos

- Uso de `react-hook-form` com `useFieldArray` para o rateio.
- `CurrencyInputBRL` já existe (`src/components/ui/currency-input-brl.tsx`).
- Datas em `<Input type="date">` (mantém padrão do form atual).
- Validação do rateio: bloqueia submit se soma ≠ valor (tolerância R$ 0,01).
- Sem mudanças de schema — a migration anterior já adicionou todas as colunas e tabelas.

## 7. Arquivos tocados

- **novo** `src/components/financeiro/NovoLancamentoDialog.tsx`
- **novo** `src/hooks/useFinanceiroCatalogs.ts`
- **edit** `src/routes/_authenticated/financeiro.tsx`: remover state `form`/`createEntry`/JSX do dialog antigo; substituir por `<NovoLancamentoDialog open=... onCreated={() => qc.invalidateQueries(['financial-entries'])} bankAccounts={bankAccounts} />`.

## 8. Fora de escopo (próximas iterações)

- Telas de cadastro de Fornecedores / Categorias / Centros de custo / Formas de pagamento (selects ficarão vazios até o usuário cadastrar — incluir link "Gerenciar cadastros" no diálogo é opcional, deixar para próximo passo).
- Edição de lançamento existente com este mesmo formulário (hoje a tela só cria).
- Recalcular `open_amount`/`payment_status` automaticamente via trigger.
