import { useMemo } from "react";
import { useChatConversations } from "./useChatConversations";

export function useChatUnreadTotal(): number {
  const { data } = useChatConversations();
  return useMemo(() => (data ?? []).reduce((acc, c) => acc + (c.unread_count || 0), 0), [data]);
}
