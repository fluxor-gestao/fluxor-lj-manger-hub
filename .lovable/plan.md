## Objetivo

Remover a dependência do push no GitHub e fazer com que **cada alteração feita aqui no Lovable** (a cada turno meu) gere automaticamente:
1. Uma ou mais entradas no painel "Alterações pendentes" (resumo do que foi feito, tipado como `implementacao`, `ajuste` ou `melhoria`).
2. Um bump imediato da versão (patch) — uma versão nova por alteração registrada.

## Como funciona

### 1. Nova função no banco: `log_change(_type, _description)`

Faz tudo em uma única chamada:
- Insere uma linha em `changelog_entries` (com `version_id = NULL`, `source_ref = 'lovable:<timestamp>'`).
- Chama internamente o mesmo fluxo do `auto_release_changelog` para promover **aquela** entrada a uma nova versão (bump de patch sobre a `system_versions` atual).
- Retorna `{ entry_id, version_id, new_version }`.

Resultado: cada chamada = 1 entrada + 1 bump. Se em um turno meu eu registrar 3 itens (ex.: 1 implementação + 2 ajustes), saem 3 bumps (v1.2.1 → v1.2.2 → v1.2.3 → v1.2.4) e o histórico mostra cada um com seu próprio item.

> Observação: você escolheu "bump a cada alteração". Confirmo que isso fará a versão subir rápido em dias de muitas mudanças — é exatamente o comportamento pedido.

### 2. Regra fixa do agente (memória do projeto)

Vou salvar uma memória `mem://` instruindo que, ao final de **toda** alteração de código que eu fizer, devo chamar `log_change` uma vez por mudança relevante, em português, frase curta no estilo das que já existem no painel. Isso garante o registro automático sem você precisar pedir.

### 3. Painel "Alterações pendentes" (UI)

- Atualizar o texto descritivo: removendo a menção a "push no GitHub" e explicando o novo comportamento ("Cada alteração feita aqui gera automaticamente uma nova versão. Esta lista mostra entradas ainda não promovidas — útil para liberar manualmente um lote.").
- **Manter** o botão "Liberar versão agora" como fallback (caso uma entrada fique pendente por qualquer motivo).
- Como cada `log_change` já promove imediatamente, em uso normal o painel ficará quase sempre vazio — exatamente como está na imagem.

### 4. Webhook do GitHub

Manter o arquivo `src/routes/api/public/github-webhook.ts` intacto (não vamos quebrar nada existente), mas ele deixa de ser o gatilho primário. Continua funcionando para o caso de você ainda fazer push manual fora do Lovable.

## Arquivos afetados

**Banco (migração):**
- Nova função `public.log_change(_type text, _description text)` em SQL — usa a lógica existente do `auto_release_changelog` para bumpar a versão atrelando só a entrada recém-criada.

**Código:**
- `src/components/admin/PendingChangelogPanel.tsx` — apenas trocar o texto do `CardDescription`.

**Memória do agente:**
- `mem://index.md` (Core) — regra: "Ao final de cada alteração de código, chamar `supabase.rpc('log_change', { _type, _description })` para cada mudança relevante, em PT-BR, frase curta."
- `mem://process/changelog` — detalhes (tipos válidos, exemplos de frases boas, quando NÃO registrar — ex.: leitura/diagnóstico puro sem mudança de arquivo).

## O que NÃO muda

- Nenhuma tabela existente (`changelog_entries`, `system_versions`) é alterada estruturalmente.
- O painel de versões, sidebar e tela de login continuam lendo de `system_versions` como hoje.
- O webhook do GitHub continua existindo e funcional.
- A função `auto_release_changelog` continua disponível para o botão "Liberar versão agora".
