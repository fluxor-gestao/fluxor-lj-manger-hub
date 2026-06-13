import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { findOrCreateContextConversation } from "@/lib/chat/api";
import type { ChatContextRef } from "@/lib/chat/types";

type ChatCtx = {
  openPanel: () => void;
  closePanel: () => void;
  panelOpen: boolean;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  openContextChat: (ctx: ChatContextRef) => Promise<void>;
};

const Ctx = createContext<ChatCtx | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Realtime global: invalida lista de conversas em qualquer mudança de messages
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel("chat-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, () => {
        qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, qc]);

  const openContextChat = useCallback(
    async (ctx: ChatContextRef) => {
      if (!user?.id) return;
      const id = await findOrCreateContextConversation(ctx, user.id);
      setActiveConversationId(id);
      setPanelOpen(true);
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
    [user?.id, qc],
  );

  const value = useMemo<ChatCtx>(
    () => ({
      panelOpen,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
      activeConversationId,
      setActiveConversationId,
      openContextChat,
    }),
    [panelOpen, activeConversationId, openContextChat],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChat() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
