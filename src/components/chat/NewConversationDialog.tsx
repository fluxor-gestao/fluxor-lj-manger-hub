import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { createDirectConversation, createAreaConversation } from "@/lib/chat/api";
import { useChat } from "./ChatProvider";
import { toast } from "sonner";

const AREAS: AppRole[] = ["admin", "comercial", "financeiro", "operacao"];

export function NewConversationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { setActiveConversationId } = useChat();
  const [mode, setMode] = useState<"direct" | "area">("direct");

  const [users, setUsers] = useState<{ user_id: string; full_name: string | null; email: string | null }[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [area, setArea] = useState<AppRole>("comercial");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .order("full_name")
      .limit(200)
      .then(({ data }) => setUsers(data ?? []));
  }, [open]);

  const filteredUsers = users.filter(
    (u) =>
      u.user_id !== user?.id &&
      ((u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase())),
  );

  const handleCreate = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      let id: string;
      if (mode === "direct") {
        if (!selectedUser) {
          toast.error("Selecione um usuário");
          return;
        }
        id = await createDirectConversation(user.id, selectedUser);
      } else {
        id = await createAreaConversation(user.id, area, title.trim() || `Área: ${area}`);
      }
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      setActiveConversationId(id);
      onOpenChange(false);
      setTitle("");
      setSelectedUser(null);
      setSearch("");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao criar conversa");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "direct" | "area")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">Usuário</TabsTrigger>
            <TabsTrigger value="area">Área</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-3">
            <Input
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto border rounded">
              {filteredUsers.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">Nenhum usuário</div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => setSelectedUser(u.user_id)}
                    className={`w-full text-left px-3 py-2 hover:bg-muted text-sm ${
                      selectedUser === u.user_id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="font-medium">{u.full_name || u.email}</div>
                    {u.full_name && <div className="text-xs text-muted-foreground">{u.email}</div>}
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="area" className="space-y-3">
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={area} onValueChange={(v) => setArea(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assunto..." />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={submitting}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
