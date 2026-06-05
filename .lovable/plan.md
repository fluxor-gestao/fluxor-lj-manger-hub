## Ajustes na página `/proposta/aceite/$token`

Arquivo único alterado: `src/routes/proposta.aceite.$token.tsx`. Nenhuma mudança em backend, PDF ou geração de propostas.

### 1. Remover o texto ao lado do logo
No `<header>`, deletar o bloco com "LUNDGAARD JENSEN" e "Advocacia & Consultoria Internacional" (o logo SVG já contém a marca). Restará só o `<img src={logo}>`.

### 2. Botões de Aceitar / Recusar no topo
- Extrair o bloco atual de botões (Aceitar / Recusar + estados `accepting` / `rejecting`) para um pequeno componente local `ActionButtons` dentro do mesmo arquivo.
- Renderizar `<ActionButtons />` em dois lugares:
  - **No topo**, logo após os banners de `showAccepted` / `showRejected`, antes do `<Card>` com o título.
  - **No final**, mantendo o bloco existente (incluindo o disclaimer "Ao aceitar, você confirma...").
- Os dois usam o mesmo `state`, então clicar em qualquer um dispara o mesmo handler; quando vira `accepting`/`rejecting`/`success`/`rejected`, ambos refletem o estado.

### 3. Estrutura resumida (3–5 bullets)
- Criar helper local `summarizeProposal(text: string): string[]` que:
  - Quebra o texto por marcadores romanos de cláusula (`I.`, `II.`, …, `XI.`).
  - Para cada cláusula encontrada, pega o **título** (primeira linha após o numeral, removendo `#`/`**`) e a **primeira frase** do corpo (até o primeiro `.` / `!` / `?` ou ~140 caracteres).
  - Retorna no máximo **5 bullets** no formato `**Título** — primeira frase.`
  - Se não encontrar marcadores, faz fallback pegando os primeiros 5 itens de lista (`-` / `*`) ou as 5 primeiras linhas não vazias.
- Na seção "Estrutura da proposta":
  - Substituir o `<ReactMarkdown>` (que renderizava o texto inteiro) por uma `<ul>` com os bullets vindos de `summarizeProposal(preview.proposal_structure)`.
  - No modo bilíngue, fazer o mesmo lado a lado: PT usa `proposal_structure`, coluna direita usa `proposal_structure_secondary`.
  - Adicionar uma legenda curta em itálico: "*Resumo das cláusulas principais. A proposta completa segue em PDF anexo.*" (e versão traduzida via o map `LANG_LABEL` existente — basta um pequeno dicionário PT/EN/FR/ES).

### Fora de escopo (explicitamente preservado)
- `exportDevisPdfFromContainer` e `DevisPdfTemplate` **continuam intocados** — o PDF exportado pelo botão "Exportar PDF" mantém a estrutura completa das 11 cláusulas.
- Edge functions `generate-devis-proposal`, `accept-devis-proposal`, `translate-devis`: sem alterações.
- Página interna `/comercial/devis/:id`: sem alterações (continua mostrando a estrutura completa).

### Detalhes técnicos
- Helper é puro (sem dependências novas); roda no client a partir do `preview.proposal_structure` já retornado pela edge function.
- Frases em outras línguas: o split por `I.`–`XI.` funciona em FR/EN/ES porque a numeração romana já é gerada igual em todas (vide `validateProposal.ts`).
- Sem mudanças em tipos, rotas, ou imports além de remover `ReactMarkdown`/`remarkGfm` se ficarem sem uso (verificar).