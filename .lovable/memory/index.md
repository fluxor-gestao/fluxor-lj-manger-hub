# Project Memory

## Core
Versionamento automático: ao final de TODA alteração de código que eu fizer (criar/editar/deletar arquivos, migrações, edge functions), chamar `supabase.rpc('log_change', { _type, _description })` uma vez por mudança relevante. Cada chamada gera 1 entrada no painel e 1 bump de patch automaticamente. `_type` ∈ `implementacao`|`ajuste`|`melhoria`. `_description` em PT-BR, frase curta no estilo dos itens já existentes. NÃO chamar em turnos só de leitura/diagnóstico sem alteração de arquivo.

## Memories
- [Changelog automático](mem://process/changelog) — tipos, exemplos de frases, quando registrar e quando não
