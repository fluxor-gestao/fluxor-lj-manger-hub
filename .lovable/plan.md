
# Alinhar proposta ao modelo Lundgaard Jensen

Objetivo: a proposta gerada e o PDF enviado ao cliente devem reproduzir fielmente o modelo do DOCX em anexo — layout bilíngue em duas colunas (PT + idioma do cliente quando estrangeiro), barra azul lateral, filetes dourados, cabeçalho com paginação e número do devis, marca d'água do mapa do Brasil e página de assinaturas bilíngue.

## 1. Conteúdo — geração inicial (momento 1)

Regra: **PT é sempre o conteúdo-base.** Se o cliente for estrangeiro (`clients.language` ≠ `pt`), gera-se também uma versão no idioma do cliente para a 2ª coluna.

- `supabase/functions/generate-devis-proposal/index.ts`
  - Forçar `lang = "pt"` na geração principal (PT continua sendo a fonte de verdade jurídica, independente do parâmetro recebido).
  - Manter toda a estrutura atual de seções I–VII, scope_items, milestones, total_amount, etc.
- Pipeline de criação do devis (em `src/routes/_authenticated/comercial_.devis.$id.tsx` e onde a geração é disparada):
  1. Chamar `generate-devis-proposal` (sempre PT).
  2. Se `client.language` ∈ {`fr`,`en`,`es`}, chamar `translate-devis` para os campos textuais: `title`, `scope_description`, `proposal_structure`, e para cada item de `scope_items` (`title`, `description`, `deliverables[]`, `stakeholders[]`, `success_metrics[]`, `duration`), além de `payment_terms` e `assumptions[]`.
  3. Persistir o resultado traduzido em colunas novas (ver migração).

### Migração de banco
Adicionar à tabela `devis`:
- `proposal_structure_secondary text`
- `scope_description_secondary text`
- `title_secondary text`
- `scope_items_secondary jsonb` (mesmo shape de `scope_items`)
- `payment_terms_secondary text`
- `assumptions_secondary jsonb`
- `secondary_language text` (`fr` | `en` | `es` | null)

Sem mudança de RLS (herdam as policies existentes de `devis`).

## 2. PDF — proposta enviada/recebida (momento 2)

Reescrever `src/components/devis/DevisPdfTemplate.tsx` para reproduzir o modelo:

**Chrome (todas as páginas):**
- Barra vertical azul (#1e40af) de ~14px na margem esquerda, indo de topo a base.
- Logo Lundgaard Jensen no canto superior esquerdo (usar `src/assets/logo-banner.png` já existente).
- "Página X de Y" no canto superior direito.
- Filete dourado horizontal (#c8a96a) abaixo do bloco do logo.
- Linha com `lundgaardjensen.com  |  @lundgaard.jensen` à esquerda e número do devis (ex: `DE202605060`) à direita.
- Outro filete dourado.
- Marca d'água: mapa do Brasil em cinza claro, centralizado/lado direito, ~70% da altura útil, atrás do conteúdo (z-index baixo, opacidade ~0.15).
- Rodapé: filete dourado + `Rua João Cordeiro, 831 – Praia de Iracema  |  +55 (85) 9 94066042  |  +55 (85) 9 30379931`.

**Conteúdo (páginas 1..N-1):**
- Se `secondary_language` existir → duas colunas equivalentes (PT esquerda / 2º idioma direita), texto justificado, gap central. Cada seção (I–VII) aparece sincronizada lado a lado.
- Se não existir → coluna única em PT ocupando toda a largura útil.
- Títulos de seção em **negrito MAIÚSCULAS sublinhados** (ex.: `I. DA IDENTIFICAÇÃO DAS PARTES` / `I. IDENTIFICATION DES PARTIES`).
- Itens de escopo: `**a) Título — BRL 4.000,00**` mantendo formato do modelo.
- Quebra automática para múltiplas páginas mantendo o chrome.

**Página final (assinaturas):**
- Centralizada, sem colunas.
- Linha + `LUNDGAARD JENSEN ADVOCACIA E CONSULTORIA INTERNACIONAL` + `CONTRATADO / CABINET`.
- Linha + `CONTRATANTE / CLIENT`.
- Bloco `Testemunhas:` com 2 colunas (Nome / CPF / Assinatura) lado a lado, igual ao modelo.

**Asset novo:** `src/assets/brazil-map.svg` (contorno do Brasil em cinza), importado pelo template e usado como `<img>` posicionado em absoluto.

## 3. Detalhes técnicos

- `DevisPdfTemplate.tsx` recebe `devis` com os campos `_secondary` opcionais e `secondary_language`; computa `isBilingual` e ramifica o layout.
- Largura A4 (`794px`) mantida; cada coluna no modo bilíngue ≈ 320px com gap de 24px e barra azul de 14px à esquerda.
- A página de assinaturas é separada (`pageBreakBefore`) — `exportDevisPdf.ts` já itera por `.devis-pdf-page`, sem alteração necessária.
- A capa de e-mail (`src/lib/email-templates/devis-proposal.tsx`) **não muda**: o anexo PDF carrega o novo layout.

## 4. Não inclui
- Mudanças no fluxo de envio de e-mail/aceite (`SendDevisDialog`, `proposta.aceite.$token`).
- Re-tradução automática de devis antigos: as colunas `_secondary` ficam nulas e o PDF renderiza monolíngue, como hoje.

## 5. Ordem de execução
1. Migração SQL (colunas `_secondary` em `devis`).
2. Asset SVG do mapa do Brasil.
3. `generate-devis-proposal`: forçar PT.
4. Pipeline de criação do devis: encadear `translate-devis` quando `client.language ≠ pt` e gravar campos `_secondary`.
5. Reescrita do `DevisPdfTemplate.tsx` com chrome novo, marca d'água, layout bilíngue condicional e página de assinaturas bilíngue.
