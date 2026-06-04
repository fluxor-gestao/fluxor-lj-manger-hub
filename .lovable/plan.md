# Refinar tradução automática para PT

## Diagnóstico

Quando o devis é gerado em outro idioma (FR/EN/ES) e o usuário clica em **"Traduzir para Português"**, a função `translate-devis` é chamada. Hoje o resultado fica "técnico/literal" — frases longas, pouca fluidez, e termos jurídicos não adaptados ao português jurídico brasileiro (ex.: estrutura de bullets cruas, repetição de "do vendedor"/"de la propriété", anglicismos como "Due Diligence" sem padronização, marcadores "(página X)" presos ao original).

A causa está em `supabase/functions/translate-devis/index.ts`:
- Prompt genérico ("tradutor profissional"), sem tom jurídico nem regras de adaptação.
- Não preserva nem reescreve a estrutura de listas A/B/C, parágrafos com travessão, fases ("Fase A", "Phase A").
- `temperature`/`reasoning_effort` não controlados → saída instável.
- Não passa contexto do tipo de documento (proposta jurídica LJ).

## Mudanças (escopo: somente backend de tradução + uma pequena melhoria na chamada do front)

### 1. `supabase/functions/translate-devis/index.ts`

Refazer prompts para qualidade jurídica + manter estrutura:

- **System prompt** novo, dirigido ao escritório (LJ), com regras explícitas:
  - Tom: proposta jurídica formal brasileira (pt-BR), 3ª pessoa, voz ativa, frases curtas.
  - Padronizar termos: "Due Diligence" → "Due Diligence (auditoria legal)" na 1ª ocorrência, depois "due diligence"; "Phase/Fase" → "Fase"; "escrow" → "escrow (depósito em garantia)" 1x; "stakeholders" → "partes interessadas"; "memorando de impacto na avaliação" preferido a calques.
  - Preservar e traduzir marcadores estruturais: bullets `- `, letras `A)`/`a)`, fases `Fase A —`, referências `(página N)` → `(página N)`.
  - Manter valores, datas, siglas (CNPJ, OAB, BRL, R$), nomes próprios, e-mails e telefones intactos.
  - **Reescrever**, não traduzir palavra-a-palavra: combinar trechos redundantes, manter sentido jurídico, garantir leitura natural em pt-BR.
  - Para listas: cada item começa com verbo no infinitivo ou substantivo claro, sem "que/de" pendurado.
  - Saída SOMENTE JSON, mesmas chaves.

- **User prompt** novo: lista as chaves esperadas, diz quais são markdown estruturado (`proposal_structure`, `scope_items`, `assumptions`) vs texto corrido (`title`, `scope_description`, `payment_terms`, `meeting_summary`, `meeting_report`, `notes`).

- **Parâmetros do modelo**:
  - Trocar `gpt-5-mini` por `gpt-5` (já há outras chamadas usando modelos maiores no projeto; melhora qualidade jurídica). Manter fallback de erro 429/401.
  - Adicionar `reasoning_effort: "medium"` (gpt-5 aceita; melhora coerência sem custo alto).
  - Manter `response_format: json_object`.

- **Pós-processamento leve em JS** (defensivo, antes de devolver):
  - Trim em cada campo string.
  - Normalizar quebras `\r\n` → `\n` e remover múltiplas linhas em branco (`\n{3,}` → `\n\n`).
  - Se `target_language === "pt"`, substituir resíduos comuns: ` da propriedade ` → ` do imóvel `, ` da venda ` mantém, `Phase ` → `Fase `, `Page ` → `Página `, `\\bDue Diligence\\b` mantém no título; remover " — " duplicados.

### 2. `src/routes/_authenticated/comercial_.devis.$id.tsx`

- No `handleToggleTranslate`, ao invés de só `title/scope_description/proposal_structure/meeting_summary/meeting_report/notes`, **também** mandar `service_type` e `responsible_sector` para tradução consistente. (Hoje já mandam — manter.)
- Adicionar `assumptions` e `scope_items` se existirem no devis (alguns devis têm), para que a tela inteira traduza junto.
- Quando o usuário clicar em "Traduzir para Português" pela 2ª vez para o mesmo devis na sessão, reaproveitar `translatedFields` (já faz). **Nenhuma mudança** de UI; só payload mais completo.

### 3. Sem mudanças em:
- `ensureDevisBilingual.ts` / PDF / fluxo de e-mail (eles usam a mesma função; vão se beneficiar automaticamente).
- Banco / migrations.
- Geração inicial (`generate-devis-proposal`).

## Verificação

1. Abrir devis gerado em FR/EN, clicar "Traduzir para Português" e validar:
   - Fluidez do "Relatório da reunião" (corresponder ao tom da imagem 2 que o usuário considera correta).
   - "Estrutura da proposta" mantém "Fase A — ..." e fica em PT.
   - Termos: "due diligence", "escrow", "memorando de impacto" aparecem padronizados.
2. Clicar novamente para alternar entre original e PT — deve ser instantâneo (cache no estado).
3. Não regredir: devis nascido em PT continua sem o botão (sourceLang === "pt").

## Detalhes técnicos resumidos

- Arquivos editados: `supabase/functions/translate-devis/index.ts`, `src/routes/_authenticated/comercial_.devis.$id.tsx`.
- Modelo: `gpt-5` com `reasoning_effort: "medium"` e `response_format: json_object` (sem `temperature`, gpt-5 ignora).
- Sem alterações de schema, RLS, ou rotas.
