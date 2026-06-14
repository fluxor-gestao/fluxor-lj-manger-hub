import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatConversations } from "@/hooks/useChatConversations";
import { useChatUsers } from "@/hooks/useChatUsers";
import { usePresence } from "@/hooks/usePresence";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/components/chat/ChatProvider";
import { ChatConversationList } from "@/components/chat/ChatConversationList";
import { ChatConversationView } from "@/components/chat/ChatConversationView";
import { NewConversationDialog } from "@/components/chat/NewConversationDialog";
import { createDirectConversation } from "@/lib/chat/api";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mensagens")({
  component: MensagensPage,
});

function MensagensPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: conversations = [] } = useChatConversations();
  const { data: allUsers = [] } = useChatUsers();
  const onlineSet = usePresence();
  const { activeConversationId, setActiveConversationId } = useChat();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [tab, setTab] = useState<"conversas" | "pessoas">("conversas");
  const [userSearch, setUserSearch] = useState("");
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

  const peopleList = useMemo(() => {
    const others = allUsers.filter((u) => u.user_id !== user?.id);
    const s = userSearch.trim().toLowerCase();
    const filteredU = s
      ? others.filter(
          (u) =>
            (u.full_name || "").toLowerCase().includes(s) ||
            (u.email || "").toLowerCase().includes(s),
        )
      : others;
    return filteredU.sort((a, b) => {
      const ao = onlineSet.has(a.user_id) ? 0 : 1;
      const bo = onlineSet.has(b.user_id) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "");
    });
  }, [allUsers, user?.id, userSearch, onlineSet]);

  const onlineCount = peopleList.filter((u) => onlineSet.has(u.user_id)).length;

  const handleOpenDM = async (otherUserId: string) => {
    if (!user?.id) return;
    try {
      const id = await createDirectConversation(user.id, otherUserId);
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      setActiveConversationId(id);
      setTab("conversas");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao abrir conversa");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mensagens Internas</h1>
          <p className="text-sm text-muted-foreground">
            Conversas privadas entre Comercial, Financeiro, Operação e Gestão.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova conversa
        </Button>
      </div>

      <Card className="grid grid-cols-1 md:grid-cols-[340px_1fr] h-[calc(100vh-220px)] overflow-hidden">
        <div className="border-r flex flex-col min-h-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-col flex-1 min-h-0">
            <div className="p-2 border-b">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="conversas" className="gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Conversas
                </TabsTrigger>
                <TabsTrigger value="pessoas" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Pessoas
                  {onlineCount > 0 && (
                    <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {onlineCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="conversas" className="flex-1 min-h-0 m-0 flex flex-col">
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
            </TabsContent>

            <TabsContent value="pessoas" className="flex-1 min-h-0 m-0 flex flex-col">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar pessoa..."
                    className="pl-8"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                {peopleList.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário.</div>
                ) : (
                  <ul className="divide-y">
                    {peopleList.map((u) => {
                      const isOnline = onlineSet.has(u.user_id);
                      return (
                        <li key={u.user_id}>
                          <button
                            type="button"
                            onClick={() => handleOpenDM(u.user_id)}
                            className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                          >
                            <div className="relative h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                              {(u.full_name || u.email || "?").slice(0, 2).toUpperCase()}
                              <span
                                className={cn(
                                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                                  isOnline ? "bg-emerald-500" : "bg-muted-foreground/40",
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{u.full_name || u.email}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {isOnline ? "Online agora" : u.email}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <div className="min-h-0 flex flex-col">
          {active ? (
            <ChatConversationView conversation={active} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-sm text-muted-foreground p-8 gap-2">
              <MessageSquare className="h-8 w-8 opacity-40" />
              <div>Selecione uma conversa ou clique em "Pessoas" para iniciar um chat direto.</div>
            </div>
          )}
        </div>
      </Card>

      <NewConversationDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
