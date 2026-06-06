## Visão geral
O módulo `/operacao` hoje é uma página única com tabela básica de `services` e diálogo de criação. Vamos evoluí-lo, em **8 partes incrementais**, para uma central operacional com Kanban, Lista, Detalhe (Sheet com abas), Timeline, Tarefas, Comentários e Insights — sem mexer no schema do banco, no Financeiro ou no BI.

> **Decisão de schema (precisa de seu OK antes da Parte 2):**
> O enum atual `service_status` tem apenas `a_iniciar | pendente | em_andamento | concluido | cancelado`. O Kanban pedido inclui também **"Aguardando cliente"** e **"Aguardando aprovação"**.
> Opção A (recomendada): pequena migração `ALTER TYPE service_status ADD VALUE …` para adicionar `aguardando_cliente` e `aguardando_aprovacao`. Não cria tabela, não quebra dados existentes.
> Opção B: manter 5 status reais e renderizar as duas colunas extras como visuais (cards arrastados pra elas voltam para `pendente`).
> Sigo com **A** se você não disser nada; se preferir B, basta avisar.

## Arquitetura de arquivos
Mantém-se a rota `src/routes/_authenticated/operacao.tsx` como casca enxuta. Extrair componentes para uma nova pasta `src/components/operacao/`:

```text
src/components/operacao/
  OperacaoHeader.tsx          // título, subtítulo, alternador Lista/Kanban, botão Novo Processo
  OperacaoKpis.tsx            // 6 cards de indicadores
  OperacaoFilters.tsx         // filtros (busca, status, responsável, BU, datas, atrasados)
  OperacaoKanban.tsx          // 7 colunas + cards arrastáveis (drag nativo, sem libs novas)
  OperacaoLista.tsx           // tabela melhorada com colunas e ações
  NovoProcessoDialog.tsx      // extrai o form de criação atual
  ProcessoDetailSheet.tsx     // Sheet com abas (Visão geral / Timeline / Tarefas / Comentários / Anexos)
  ProcessoTimeline.tsx        // timeline mockada a partir de status + datas
  ProcessoTarefas.tsx         // lista local (estado em memória) — preparação para tabela operation_tasks
  ProcessoComentarios.tsx     // feed local (estado em memória)
  InsightsOperacionais.tsx    // bloco de insights calculado no front
  status.ts                   // labels, cores, ordem das colunas, helpers de SLA/atraso
src/hooks/useOperacao.ts      // query unificada de services + catálogos (clients, profiles para responsáveis)
```

Padrões já usados no projeto: `useQuery`/`useMutation`, `supabase` client, `shadcn/ui` (Card, Sheet, Dialog, Tabs, Table, Badge, Select, DropdownMenu), `lucide-react`, `sonner`, Tailwind com tokens semânticos. Sem novas dependências.

## Execução por partes

### Parte 1 — Layout principal (header, KPIs, filtros, alternador Lista/Kanban)
- Novo cabeçalho com título/subtítulo, botão **Novo Processo** (reaproveita o form atual) e toggle **Lista / Kanban** (estado local, padrão Lista).
- 6 KPIs calculados sobre `services`:
  - **Ativos** = status ∈ {a_iniciar, pendente, em_andamento, aguardando_*}
  - **Pendentes** = `pendente`
  - **Em andamento** = `em_andamento`
  - **Atrasados** = `expected_end_date < hoje && status ∉ {concluido, cancelado}`
  - **Concluídos no mês** = `status=concluido && actual_end_date` no mês atual
  - **SLA médio** = média de (`actual_end_date - start_date`) para concluídos do mês, em dias
- Filtros: busca textual (title/description/cliente), status (multi), responsável (`assigned_to` via `profiles`), BU, intervalo de `start_date` e `expected_end_date`, toggle "Apenas atrasados". Estado local, aplicado em memória sobre a query principal.

### Parte 2 — Kanban
- `OperacaoKanban` renderiza 7 colunas na ordem do spec.
- Card mostra: título, cliente (join `clients(name)`), BU, responsável (join `profiles(full_name)`), `start_date`, `expected_end_date`, badge de status, **badge "Atrasado"** quando aplicável, e dois badges mockados de **comentários** e **pendências** (contagem fake estável por id).
- Drag-and-drop com HTML5 nativo (`draggable`, `onDragStart`, `onDrop`) — sem libs novas. Drop em outra coluna dispara o `updateStatus` já existente (mantém a regra de setar `actual_end_date` ao concluir).

### Parte 3 — Lista (refino da tabela atual)
- Mantém `services` como fonte. Colunas: Processo (título + descrição curta), BU, Responsável/Setor, Início, Previsão, Conclusão, Status, **SLA** (dias decorridos × previsto, com cor), Ações.
- Ações via `DropdownMenu`: Ver detalhes, Alterar status (submenu), Finalizar (atalho p/ `concluido`), Cancelar.
- Linha ganha indicador visual de atraso.

### Parte 4 — Detalhe do processo (Sheet lateral com abas)
- `ProcessoDetailSheet` abre via "Ver detalhes" no Kanban e na Lista.
- Cabeçalho do Sheet: título, BU, responsável, status (com select inline para alterar), badge de atraso, SLA calculado.
- **Tabs:** Visão geral · Timeline · Tarefas · Comentários · Anexos (placeholder "Em breve").
- Visão geral: descrição, datas (início/previsão/real), observações, e o bloco `InsightsOperacionais` (versão compacta).

### Parte 5 — Timeline
- Eventos derivados de regras simples sobre o registro:
  - **Criado** ← `created_at`
  - **Iniciado** ← `start_date`
  - **Pendente / Em andamento / Aguardando cliente / Aguardando aprovação** ← marcador no status atual (mock de datas usando `updated_at` quando aplicável)
  - **Concluído** ← `actual_end_date`
  - **Documento final enviado** ← placeholder "Em breve"
- Visual: linha vertical com ícones + labels (sem libs novas).

### Parte 6 — Tarefas internas (mock local)
- Lista em estado local dentro do Sheet (não persiste). Campos: tarefa, responsável, prazo, status, prioridade.
- Form simples para adicionar. Comentário no topo do arquivo deixa claro: *"TODO: persistir em `operation_tasks` (tabela futura)"*.

### Parte 7 — Comentários (mock local)
- Feed em estado local: autor (usuário atual via `useAuth`), data/hora, texto, etapa relacionada (status atual no momento do post).
- Comentário no topo do arquivo: *"TODO: persistir em `operation_comments` (tabela futura)"*.

### Parte 8 — Inteligência operacional
- Bloco `InsightsOperacionais` em duas variantes: global (na home do módulo, opcional) e por processo (no Sheet).
- Regras no front-end:
  - **Atrasado há X dias** = `hoje - expected_end_date` quando positivo e não concluído.
  - **Parado há N dias** = `hoje - updated_at` quando > 7 e não concluído.
  - **Prazo próximo** = `expected_end_date` dentro de 3 dias.
  - **Concentração em etapa** = >40% dos processos ativos em uma única etapa.
  - **Pendentes sem responsável** = `status=pendente && assigned_to is null`.

## Restrições e premissas
- Sem novas tabelas. Tarefas e comentários ficam em estado local (preparados para futura persistência).
- A única possível mudança de schema é a extensão do enum `service_status` na Parte 2 (Opção A acima) — só executo após sua confirmação.
- Sem mexer em Financeiro nem BI. Sem novas dependências (drag-and-drop nativo, sem libs de kanban).
- Visual SaaS B2B executivo, usando tokens do design system existente.

## Sequência sugerida de entregas
1. Parte 1 (header, KPIs, filtros, toggle).
2. Confirmação da Opção A/B do enum → Parte 2 (Kanban).
3. Parte 3 (Lista refinada) + Parte 4 (Sheet com abas — só esqueleto + Visão geral).
4. Partes 5, 6, 7 dentro do Sheet.
5. Parte 8 (Insights global + por processo).

Posso começar pela Parte 1 assim que aprovar o plano. Me confirme também a opção do enum (A ou B) para destravar a Parte 2.