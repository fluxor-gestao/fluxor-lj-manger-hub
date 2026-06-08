# Plano: Refatorar Rapport como gerador independente de extrato

Transformar `src/routes/_authenticated/financeiro.rapport.tsx` em uma ferramenta autônoma de prestação de contas, desacoplada de `financial_entries`, baseada em upload de extrato bancário e geração multi-idioma.

## Escopo

Reescrever **apenas** o arquivo `src/routes/_authenticated/financeiro.rapport.tsx`. Nenhuma alteração em Central Financeira, Contas a Pagar/Receber, schema do banco ou outros módulos.

## Fluxo do usuário (wizard linear no topo)

```text
[1 Cliente] → [2 Mês] → [3 Idioma] → [4 Upload extrato] → [Processar] → [Gerar Rapport]
```

Botões de ação: **Processar extrato**, **Gerar Rapport**, **Copiar resumo**, **Exportar PDF** (toast "em breve"), **Enviar ao cliente** (toast "em breve").

## Estrutura da página (top → bottom)

1. **Header** — título "Rapport", subtítulo "Relatório mensal a partir de extrato bancário", botão Voltar.
2. **Card de configuração** — grid com:
   - Select Cliente (de `useFinanceiroCatalogs().clients`)
   - Input month (mês de referência)
   - Select Idioma: PT, EN, ES, FR, DE, IT
   - Dropzone de upload (PDF, CSV, XLS, XLSX) com estado vazio/arquivo carregado/processando
   - Botão "Processar extrato" (habilita "Gerar Rapport" ao concluir)
3. **6 KPI Cards**: Saldo inicial · Total de entradas · Total de saídas · Saldo líquido · Saldo final · Qtde de movimentações.
4. **Gráficos (Recharts)**:
   - Linha: Evolução do saldo no período
   - Barras agrupadas: Entradas × Saídas por semana
   - Barras horizontais: Top maiores entradas
   - Barras horizontais: Top maiores saídas
   - Pizza: Distribuição das saídas por categoria sugerida
   - Pizza: Distribuição das entradas por origem sugerida
5. **Tabela de movimentações** — colunas: Data, Descrição original, Tipo (badge Entrada/Saída), Valor, Categoria sugerida, Observação.
6. **Resumo do Rapport** — bloco de texto gerado no idioma escolhido, com botão Copiar.
7. **Itens de atenção** — cards inteligentes baseados em regras (ver abaixo).

## Detalhes técnicos

### Estado e processamento (mock)

- Estados: `clientId`, `month`, `language`, `file`, `status` (`idle | processing | ready`), `transactions` (array tipado).
- Tipo: `Transaction { id, date, description, type: 'entrada'|'saida', amount, suggestedCategory, note }`.
- "Processar extrato": após pequeno delay simulado, popula `transactions` com **dataset mock determinístico** derivado do mês selecionado (12–20 movimentações realistas: PIX, boletos, taxas, salários, fornecedores). Marca `status = 'ready'`. Mantemos a estrutura pronta para plugar parser real depois — nenhum parser real será implementado nesta etapa.
- "Gerar Rapport": apenas seta um flag `generated = true` que revela KPIs/gráficos/resumo/atenção (já calculados via `useMemo`).
- Saldo inicial: derivado do mock (valor base do mês). Saldo final = saldo inicial + soma líquida. Líquido = entradas − saídas.

### Idiomas e dicionário i18n local

- Objeto `i18n` no próprio arquivo com chaves para labels da UI **e** templates do resumo executivo nos 6 idiomas.
- `language` (default `pt`) controla labels e geração do resumo. Sem dependência de biblioteca i18n — dicionário inline.
- Resumo executivo: função pura que recebe métricas + idioma e devolve string com placeholders preenchidos (moeda, mês, comparações).

### Agregações (useMemo)

- Totais (entradas, saídas, líquido, qtd, saldo final).
- Série diária de saldo acumulado para o gráfico de evolução.
- Buckets semanais (Semana 1–5) com entradas/saídas.
- Top 5 entradas e Top 5 saídas (por valor absoluto).
- Distribuição por `suggestedCategory` (saídas) e por origem (entradas) — sugestão derivada do mock.

### Itens de atenção (regras)

Cada regra empurra um card com ícone, título, descrição e tom (info/warn/danger):
- **Concentração de saídas**: top 1 saída ≥ 40% do total de saídas.
- **Saldo final < saldo inicial**.
- **Grande entrada pontual**: maior entrada ≥ 50% do total de entradas.
- **Aumento de saídas recorrentes**: ≥ 3 descrições repetidas com valores crescentes.
- **Movimentações sem categoria**: contagem de itens com `suggestedCategory` vazio.
- **Possível cobrança duplicada**: mesma descrição + mesmo valor em datas próximas (±2 dias).
- Fallback: card neutro "Nenhum ponto crítico identificado" se nenhuma regra disparar.

### Restrições respeitadas

- Zero uso de `financial_entries` ou `useFinanceiroCatalogs` além de `clients`.
- Termos "receitas/despesas" removidos da UI; substituídos por Entradas/Saídas/Saldo.
- Sem chamadas Supabase de leitura financeira nesta tela.
- Sem parser real, sem integração bancária, sem novas tabelas, sem mexer em outros módulos.
- Visual SaaS B2B: shadcn/ui, Tailwind, lucide, Recharts — mesmo padrão executivo das outras telas.

## Entregáveis

- `src/routes/_authenticated/financeiro.rapport.tsx` reescrito.
- Nenhum outro arquivo alterado.