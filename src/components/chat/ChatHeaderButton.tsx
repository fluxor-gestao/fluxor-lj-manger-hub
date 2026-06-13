import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useChat } from "./ChatProvider";
import { useChatConversations } from "@/hooks/useChatConversations";
import { useChatUnreadTotal } from "@/hooks/useChatUnreadTotal";
import { ChatConversationList } from "./ChatConversationList";
import { ChatConversationView } from "./ChatConversationView";
import { NewConversationDialog } from "./NewConversationDialog";

export function ChatHeaderButton() {
  const unread = useChatUnreadTotal();
  const { data: conversations = [] } = useChatConversations();
  const { activeConversationId, setActiveConversationId } = useChat();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const active = conversations.find((c) => c.id === activeConversationId) ?? null;
  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (c.title || "").toLowerCase().includes(s) ||
      (c.context_label || "").toLowerCase().includes(s) ||
      (c.last_message?.body || "").toLowerCase().includes(s)
    );
  });

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Mensagens">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px]">
                {unread > 99 ? "99+" : unread}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="p-0 w-[420px] max-w-[95vw]">
          <div className="flex flex-col h-[520px]">
            <div className="px-3 py-2 border-b flex items-center gap-2">
              <Input
                placeholder="Buscar mensagens..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
              />
              <Button size="icon" variant="ghost" onClick={() => setNewOpen(true)} title="Nova conversa">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {active ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <button
                  onClick={() => setActiveConversationId(null)}
                  className="text-xs text-primary text-left px-3 py-1 border-b hover:underline"
                >
                  ← Voltar para conversas
                </button>
                <ChatConversationView conversation={active} className="flex-1" />
              </div>
            ) : (
              <div className="flex-1 min-h-0">
                <ChatConversationList
                  conversations={filtered}
                  activeId={activeConversationId}
                  onSelect={(id) => setActiveConversationId(id)}
                  emptyLabel="Nenhuma conversa ainda. Crie uma para começar."
                />
              </div>
            )}

            <div className="border-t p-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/mensagens" });
                }}
              >
                Abrir Central de Mensagens
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <NewConversationDialog open={newOpen} onOpenChange={setNewOpen} />
    </>
  );
}
