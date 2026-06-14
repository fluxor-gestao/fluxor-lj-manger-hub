import type { AppRole } from "@/contexts/AuthContext";

export type ConversationType = "direct" | "area" | "context";

export type Conversation = {
  id: string;
  type: ConversationType;
  title: string | null;
  area: AppRole | null;
  context_type: string | null;
  context_id: string | null;
  context_label: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type MessageAttachment = {
  path: string;
  name: string;
  size: number;
  mime: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  attachments?: MessageAttachment[];
};

export type Participant = {
  id: string;
  conversation_id: string;
  user_id: string;
  area: AppRole | null;
  last_read_at: string | null;
  created_at: string;
};

export type ChatContextRef = {
  contextType: string;
  contextId: string;
  contextLabel: string;
};

export type ConversationWithMeta = Conversation & {
  last_message?: Message | null;
  unread_count: number;
  participants?: Participant[];
};
