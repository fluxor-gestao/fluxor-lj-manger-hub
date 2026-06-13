## Chat Interno Corporativo

Adicionar comunicação interna entre áreas (Comercial, Financeiro, Operação, Gestão, Admin), com ícone no header, central de mensagens, conversas contextuais (vinculadas a Devis/Cliente/Cobrança/etc.) e tempo real via Supabase Realtime.

### 1. Banco de dados (migration única)

Tabelas em `public`:

- `conversations` — `id`, `type` ('direct'|'area'|'context'), `title`, `area` (app_role|null), `context_type`, `context_id`, `context_label`, `created_by`, `created_at`, `updated_at`
- `conversation_participants` — `id`, `conversation_id`, `user_id`, `area` (app_role|null), `last_read_at`, `created_at` — UNIQUE(conversation_id, user_id)
- `messages` — `id`, `conversation_id`, `sender_id`, `body`, `created_at`, `edited_at`, `deleted_at`

GRANTs para `authenticated` + `service_role`. RLS ativo.

**Função SECURITY DEFINER** `is_conversation_participant(_conv uuid, _user uuid)` para evitar recursão em policies (segue padrão do `has_role`). Inclui acesso por área: se a conversa tem `area` e o usuário possui aquele role, é participante implícito.

Policies:
- `conversations`: SELECT se `is_conversation_participant(id, auth.uid())` OU admin OU `created_by=auth.uid()`. INSERT por authenticated (com `created_by=auth.uid()`). UPDATE pelo criador/admin.
- `conversation_participants`: SELECT/INSERT/UPDATE/DELETE pelo participante ou admin.
- `messages`: SELECT se participante da conversa. INSERT se participante e `sender_id=auth.uid()`. UPDATE/DELETE pelo sender.

Trigger `update_updated_at_column` em `conversations`. Trigger em `messages` AFTER INSERT para atualizar `conversations.updated_at`.

Adicionar tabelas à publication `supabase_realtime`.

### 2. Hooks e libs

- `src/lib/chat/types.ts` — tipos `Conversation`, `Message`, `Participant`, `ChatContext`.
- `src/hooks/useChatConversations.ts` — lista conversas do usuário (via RLS), com último message preview e unread count (compara `last_read_at` do participante vs `messages.created_at`).
- `src/hooks/useChatMessages.ts` — busca mensagens de uma conversa + subscribe Realtime (postgres_changes em `messages` filtrado por `conversation_id`).
- `src/hooks/useChatUnreadTotal.ts` — total global de não lidas para o badge.
- `src/hooks/useOpenContextConversation.ts` — função para "abrir conversa vinculada a este Devis/Cobrança" (find-or-create via `context_type`+`context_id`, adiciona criador como participante).
- `src/lib/chat/markAsRead.ts` — atualiza `last_read_at` do participante.

Realtime: um único canal global em `ChatProvider` que invalida `useChatUnreadTotal` e `useChatConversations` ao receber INSERT em `messages`.

### 3. Componentes UI

- `src/components/chat/ChatProvider.tsx` — wrapper de contexto, monta subscription global Realtime, expõe `openChat()`, `openContextChat(ctx)`.
- `src/components/chat/ChatHeaderButton.tsx` — ícone `MessageSquare` + badge de não lidas. Abre `ChatPopover`.
- `src/components/chat/ChatPopover.tsx` — popover com últimas conversas, busca, botão "Abrir Central de Mensagens" que navega para `/mensagens`.
- `src/components/chat/ChatConversationList.tsx` — lista reutilizável (popover e central).
- `src/components/chat/ChatConversationView.tsx` — thread com bolhas (próprias à direita, outros à esquerda), input, envio.
- `src/components/chat/NewConversationDialog.tsx` — escolher destinatário (usuário via profiles, área, ou contextual).
- `src/components/chat/ContextChatButton.tsx` — botão reutilizável "Conversar sobre este registro" para Devis/Cobrança/etc.

Integração:
- `AppLayout.tsx`: adicionar `<ChatHeaderButton />` ao lado de `FluxorSupportButton` e envolver Outlet em `ChatProvider`.
- Nova rota `src/routes/_authenticated/mensagens.tsx` — central completa (lista à esquerda, conversa à direita, filtros: todas/não lidas, busca).

### 4. Mensagens contextuais

`ContextChatButton` aceita `{ contextType, contextId, contextLabel }`. Ao clicar:
1. Procura conversa existente com mesmos `context_type`+`context_id`.
2. Se não existir, cria conversa `type='context'` e adiciona usuário como participante.
3. Abre painel da conversa.

Pontos de inserção (apenas adicionar o botão, sem alterar lógica):
- `comercial_.devis.$id.tsx` (header do detalhe Devis)
- `CobrancaDetailSheet.tsx`
- `ProcessoDetailSheet.tsx` (operação)

### 5. Permissões

RLS já garante visibilidade. Admin é coberto via `has_role(auth.uid(), 'admin')` nas policies.

### 6. Não inclui

Sem anexos (tabela `message_attachments` fica para depois), sem edição/exclusão UI (campos no DB ficam reservados), sem typing indicators, sem push notifications externas.

### Resultado

Header ganha ícone de mensagens com badge. Usuários conversam 1-a-1, por área ou vinculado a registros, em tempo real, sem alterar nada dos módulos existentes.