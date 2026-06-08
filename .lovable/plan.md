## Objetivo

Transformar `/financeiro/contas-a-pagar` em uma ferramenta preventiva de gestão de caixa, mostrando se o saldo disponível cobre os pagamentos previstos e sinalizando riscos.

Esta etapa é apenas de UI/lógica de apresentação — sem integração bancária real e sem nova migration. O "saldo disponível" virá de uma fonte simplificada (ver Fonte do saldo).

## Fonte do saldo disponível

Sem integração bancária ainda, uso uma estratégia leve, configurável pelo usuário:

1. **Persistência local (localStorage)** com duas chaves:
   - `cap.availableBalance` (number, BRL) — saldo disponível atual.
   - `cap.minBalance` (number, BRL) — limite mínimo de caixa.
2. Pequeno botão "Configurar caixa" no header da página abre um dialog para editar esses dois valores. Default: 0.
3. Se ambos forem 0/indefinidos, mostro um estado "Caixa não configurado" no card de Saúde de Caixa com CTA para configurar (sem quebrar a tela).

Isso satisfaz o item 7 (cálculo simplificado/mockado) sem criar tabelas.

## Cálculos

- `previstoTotal` = soma de `open_amount` de todas as despesas com status ≠ pago.
- `previsto7d` = soma de `open_amount` cujo `due_date` ∈ [hoje, hoje+7].
- `saldoProjetado` = `available − previstoTotal`.
- `deficit` = `max(0, previstoTotal − available)`.

### Status do card "Saúde de Caixa"
- **Saudável** (verde): `available ≥ previstoTotal` e `available ≥ minBalance`.
- **Atenção** (âmbar): `available ≥ previstoTotal` mas `available < minBalance`; **ou** `saldoProjetado` cobre 7 dias mas não o total.
- **Insuficiente** (vermelho): `available < previstoTotal` (ou `available < previsto7d`).

### Impacto no Caixa por linha (coluna nova)
Acumulo `open_amount` em ordem de vencimento (asc). Para cada linha `r`:
- `cumulative += r.open`.
- **Coberto** (verde): `cumulative ≤ available`.
- **Apertado** (âmbar): `cumulative > available` e `cumulative − r.open < available` (linha que cruza o limite, parcialmente coberta).
- **Sem cobertura** (vermelho): `cumulative − r.open ≥ available`.

Linhas já pagas exibem "—".

## Mudanças de arquivos

### 1. `src/routes/_authenticated/financeiro.contas-a-pagar.tsx`
- Hook `useCashSettings()` lendo/escrevendo `available` e `minBalance` no localStorage (com `useState` + `useEffect`).
- Botão "Configurar caixa" no header, abre `<CashSettingsDialog />` (inline, simples — dois inputs BRL + salvar).
- Novo card **Saúde de Caixa** logo abaixo da linha de KPIs (full-width em mobile, ocupa 2 cols em lg), mostrando:
  - Status badge (Saudável / Atenção / Insuficiente) com ícone.
  - 3 valores em linha: `Saldo disponível − Pagamentos previstos = Saldo projetado` (com sinal e cor).
  - Linha extra: `Limite mínimo: X` + barra de progresso (saldo vs mínimo) quando `minBalance > 0`.
  - Alert visual (`<Alert variant="destructive">` ou warning) quando `available < previstoTotal` ou `available < minBalance`.
- `coverageByRow` calculado uma vez via `useMemo` sobre `allRows` ordenados por `due_date` asc (mapa `id → "coberto"|"apertado"|"sem"`), reaproveitado na tabela.
- Nova coluna **Impacto no Caixa** na tabela (após "Status"), renderizando um `Badge` com a cor correspondente; para linhas pagas, "—".
- Novo bloco **Insights de Caixa** (Card) abaixo da tabela, com 4 mini-cards:
  - Fundos insuficientes: `Sim/Não` baseado no status do card.
  - Pagamentos em risco: contagem de linhas `apertado + sem cobertura`.
  - Valor total sem cobertura: soma do `open_amount` das "sem cobertura" + parcela descoberta da "apertado".
  - Contas críticas próximos 7 dias: lista compacta (até 5) das `sem cobertura` ou `apertado` com `due_date ≤ hoje+7`, mostrando fornecedor, vencimento e valor.
- Dialog "Ver detalhes" (substitui o `act("Ver detalhes", …)` atual) abre um `Sheet` simples mostrando:
  - Fornecedor, descrição, vencimento.
  - Valor da despesa (`open_amount`).
  - Saldo disponível atual.
  - Saldo projetado após pagamento (`available − open`).
  - Déficit (se < 0) ou Sobra (se ≥ 0).
  - Badge "Impacto no Caixa" + Alert visual quando sem cobertura.

Tudo isolado a esta página; nenhuma outra rota é alterada.

## Restrições respeitadas
- Sem nova tabela / migration / edge function.
- Sem integração bancária.
- Sem alteração no Contas a Receber, Rapport, Comercial, Operação, BI.
- Visual mantém o padrão SaaS B2B (Card + Badge + Alert do design system).
