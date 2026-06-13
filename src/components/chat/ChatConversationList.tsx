import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ConversationWithMeta } from "@/lib/chat/types";
import { MessageSquare, Users, Link2 } from "lucide-react";

export function ChatConversationList({
  conversations,
  activeId,
  onSelect,
  emptyLabel = "Nenhuma conversa.",
}: {
  conversations: ConversationWithMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  emptyLabel?: string;
}) {
  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
    );
  }
  return (
    <ScrollArea className="h-full">
      <ul className="divide-y">
        {conversations.map((c) => {
          const Icon = c.type === "area" ? Users : c.type === "context" ? Link2 : MessageSquare;
          const title =
            c.title ||
            (c.type === "context" ? c.context_label : c.type === "area" ? `Área: ${c.area}` : "Conversa direta");
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={cn(
                  "w-full text-left px-3 py-2 flex gap-3 items-start hover:bg-muted/50 transition-colors",
                  activeId === c.id && "bg-muted",
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{title}</span>
                    {c.unread_count > 0 && (
                      <Badge className="h-5 min-w-5 px-1 text-[10px]">{c.unread_count}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.last_message?.body || "Sem mensagens"}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
}
