import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChatConversations } from "@/hooks/useChatConversations";
import { useChat } from "@/components/chat/ChatProvider";
import { ChatConversationList } from "@/components/chat/ChatConversationList";
import { ChatConversationView } from "@/components/chat/ChatConversationView";
import { NewConversationDialog } from "@/components/chat/NewConversationDialog";

export const Route = createFileRoute("/_authenticated/mensagens")({
  component: MensagensPage,
});

function MensagensPage() {
  const { data: conversations = [] } = useChatConversations();
  const { activeConversationId, setActiveConversationId } = useChat();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [newOpen, setNewOpen] = useState(false);

  const filtered = conversations.filter((c) => {
    if (filter === "unread" && c.unread_count === 0) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (c.title || "").toLowerCase().includes(s) ||
      (c.context_label || "").toLowerCase().includes(s) ||
      (c.last_message?.body || "").toLowerCase().includes(s)
    );
  });

  const active = conversations.find((c) => c.id === activeConversationId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mensagens Internas</h1>
          <p className="text-sm text-muted-foreground">
            Comunicação interna entre Comercial, Financeiro, Operação e Gestão.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova conversa
        </Button>
      </div>

      <Card className="grid grid-cols-1 md:grid-cols-[340px_1fr] h-[calc(100vh-220px)] overflow-hidden">
        <div className="border-r flex flex-col min-h-0">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="unread">Não lidas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 min-h-0">
            <ChatConversationList
              conversations={filtered}
              activeId={activeConversationId}
              onSelect={(id) => setActiveConversationId(id)}
            />
          </div>
        </div>

        <div className="min-h-0 flex flex-col">
          {active ? (
            <ChatConversationView conversation={active} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-sm text-muted-foreground p-8">
              Selecione uma conversa à esquerda ou crie uma nova.
            </div>
          )}
        </div>
      </Card>

      <NewConversationDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
