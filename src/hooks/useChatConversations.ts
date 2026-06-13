import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation, ConversationWithMeta, Message, Participant } from "@/lib/chat/types";

export function useChatConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chat", "conversations", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ConversationWithMeta[]> => {
      // RLS já filtra: só conversas que o usuário pode ver
      const { data: convs, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const list = (convs ?? []) as Conversation[];
      if (list.length === 0) return [];

      const ids = list.map((c) => c.id);
      const [{ data: msgs }, { data: parts }] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false }),
        supabase
          .from("conversation_participants")
          .select("*")
          .in("conversation_id", ids),
      ]);

      const lastByConv = new Map<string, Message>();
      (msgs ?? []).forEach((m) => {
        if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m as Message);
      });

      const partsByConv = new Map<string, Participant[]>();
      (parts ?? []).forEach((p) => {
        const arr = partsByConv.get(p.conversation_id) ?? [];
        arr.push(p as Participant);
        partsByConv.set(p.conversation_id, arr);
      });

      const meParts = (parts ?? []).filter((p) => p.user_id === user!.id);
      const meReadByConv = new Map<string, string | null>();
      meParts.forEach((p) => meReadByConv.set(p.conversation_id, p.last_read_at));

      const unreadByConv = new Map<string, number>();
      (msgs ?? []).forEach((m) => {
        if (m.sender_id === user!.id) return;
        const lastRead = meReadByConv.get(m.conversation_id);
        if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
          unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
        }
      });

      return list.map((c) => ({
        ...c,
        last_message: lastByConv.get(c.id) ?? null,
        unread_count: unreadByConv.get(c.id) ?? 0,
        participants: partsByConv.get(c.id) ?? [],
      }));
    },
  });
}
