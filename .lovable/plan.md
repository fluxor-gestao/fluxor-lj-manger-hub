# Proposta bilíngue lado a lado (PT fixo + idioma do cliente)

Mantém design, logo, numeração, assinaturas, fluxo de aceite, estrutura de 11 cláusulas e PDF intactos. Corrige 3 problemas: (1) IA gerando texto misturado com FR/ES, (2) `*_secondary` não persistido antes do envio, (3) página de aceite monolíngue.

## Regra de idioma

- **PT é sempre a fonte de verdade** (gerado pela IA, coluna esquerda).
- **2ª coluna varia** conforme `source_language` detectado do cliente:
  - `fr` → coluna direita em francês
  - `en` → coluna direita em inglês
  - `es` → coluna direita em espanhol
  - `pt` (cliente brasileiro) → coluna única, sem 2ª coluna
- Tradução vem de `translate-devis` e é gravada em `*_secondary` no banco.

## Mudanças

### 1. `supabase/functions/generate-devis-proposal/index.ts`
Endurecer o system prompt para **garantir pt-BR puro**:
- Proibir qualquer token em FR/EN/ES nos campos `title`, `scope_description`, `scope_items.*` (ex: "Proposition", "lieu", "honoraires", "scope", "client").
- Proibir placeholders `[ ]`, `{ }`, `< >`, `« »`, "lorem", "TBD".
- Se o documento do cliente estiver em outro idioma, traduzir tudo para PT antes de redigir.
- Pós-processamento server-side: remover colchetes/chaves residuais; se detectar palavra-chave estrangeira no título, fallback para título genérico PT.
- **Sem mudança** na estrutura das 11 cláusulas nem na montagem do `proposal_structure`.

### 2. `src/components/devis/SendDevisDialog.tsx`
Já chama `ensureDevisBilingual(devis)` antes de gerar o PDF — manter. **Adicionar**: propagar o `effectiveDevis` (com `*_secondary` persistido) ao payload de `send-devis-proposal` para que o link de aceite use os dados já traduzidos no banco.

### 3. `supabase/functions/accept-devis-proposal/index.ts`
Expandir `PREVIEW_FIELDS` e `previewPayload` para incluir:
- `secondary_language`, `source_language`
- `title_secondary`, `scope_description_secondary`, `proposal_structure_secondary`
- (já inclui `down_payment_amount`)

Sem mudanças nas regras de aceite/recusa.

### 4. `src/routes/proposta.aceite.$token.tsx` — Layout bilíngue lado a lado
Espelhar exatamente o .docx de referência:
- Se `secondary_language` existir e `proposal_structure_secondary` não estiver vazio:
  - Container `max-w-6xl`.
  - Header do título: 2 colunas (PT à esquerda, idioma secundário à direita) com micro-labels `PT` / `FR`|`EN`|`ES`.
  - Corpo do `proposal_structure`: `grid md:grid-cols-2 gap-8`, PT à esquerda + secundário à direita, ambos renderizados com `ReactMarkdown` + `remarkGfm`.
  - Mobile (`<md`): colunas empilhadas (PT primeiro, secundário depois).
- Se cliente PT (sem `*_secondary`): mantém layout atual de coluna única (`max-w-3xl`).
- Cards de **Valor total / Entrada / Prazo permanecem únicos** (valores em BRL, datas universais).
- Botões "Aceitar" / "Recusar", header com logo, footer, diálogo de recusa: **sem mudanças**.

### 5. Sem mudanças
- `DevisPdfTemplate.tsx` (já é bilíngue lado a lado).
- `translate-devis` (já traduz todos os campos necessários).
- `send-devis-proposal` (e-mail).
- Migrações de banco, numeração, validação das 11 cláusulas, assinaturas, marca d'água, design tokens, logo.

## Resultado

- Propostas geradas saem 100% em pt-BR, sem fragmentos FR/ES.
- Antes do envio, `*_secondary` é persistido no banco para clientes estrangeiros.
- Página `/proposta/aceite/:token` exibe layout idêntico ao PDF: 2 colunas (PT | idioma do cliente) lado a lado em desktop, empilhadas em mobile. Cliente PT vê coluna única.
- PDF, e-mail, preview interno e página pública mostram o mesmo conteúdo.
