import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useChatMessages } from "@/hooks/useChatMessages";
import { markConversationRead, sendMessage } from "@/lib/chat/api";
import type { ConversationWithMeta } from "@/lib/chat/types";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function ChatConversationView({
  conversation,
  className,
}: {
  conversation: ConversationWithMeta;
  className?: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: messages = [] } = useChatMessages(conversation.id);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    markConversationRead(conversation.id, user.id).then(() => {
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    });
  }, [conversation.id, user?.id, messages.length, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!user?.id || !body.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(conversation.id, user.id, body);
      setBody("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      <div className="border-b px-4 py-3 shrink-0">
        <div className="font-medium text-sm truncate">
          {conversation.title || (conversation.type === "context" ? conversation.context_label : "Conversa")}
        </div>
        {conversation.context_type && (
          <Badge variant="outline" className="mt-1 text-xs">
            {conversation.context_type}: {conversation.context_label}
          </Badge>
        )}
        {conversation.area && (
          <Badge variant="secondary" className="mt-1 text-xs">
            Área: {conversation.area}
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="px-4 py-3 space-y-2">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhuma mensagem ainda. Envie a primeira!
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm break-words",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className={cn("text-[10px] mt-1 opacity-70", mine ? "text-right" : "")}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t p-2 flex gap-2 shrink-0">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escreva uma mensagem..."
          className="min-h-[40px] max-h-32 resize-none"
        />
        <Button size="icon" onClick={handleSend} disabled={!body.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
