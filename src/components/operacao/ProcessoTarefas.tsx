// TODO: persistir em uma tabela futura `operation_tasks` (process_id, title, assignee,
// due_date, status, priority). Por enquanto a lista vive em estado local.
import { useState } from "react";
import { Plus, Trash2, User, Calendar, Tag, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Prio = "baixa" | "media" | "alta";
type TaskStatus = "aberta" | "em_andamento" | "concluida";

type LocalTask = {
  id: string;
  title: string;
  assignee: string;
  due_date: string;
  status: TaskStatus;
  priority: Prio;
};

const prioCls: Record<Prio, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-amber-500/10 text-amber-600",
  alta: "bg-destructive/10 text-destructive",
};
const statusCls: Record<TaskStatus, string> = {
  aberta: "bg-muted text-muted-foreground",
  em_andamento: "bg-primary/10 text-primary",
  concluida: "bg-emerald-500/10 text-emerald-600",
};
const statusLabel: Record<TaskStatus, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

export function ProcessoTarefas() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [draft, setDraft] = useState<Omit<LocalTask, "id">>({
    title: "",
    assignee: "",
    due_date: "",
    status: "aberta",
    priority: "media",
  });

  const add = () => {
    if (!draft.title.trim()) return;
    setTasks((t) => [
      ...t,
      { ...draft, id: Math.random().toString(36).slice(2, 9) },
    ]);
    setDraft({ title: "", assignee: "", due_date: "", status: "aberta", priority: "media" });
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="py-3 grid gap-2 md:grid-cols-[1fr_180px_140px_140px_140px_auto] items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tarefa</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Descreva a tarefa" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Responsável</Label>
            <Input value={draft.assignee} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Prazo</Label>
            <Input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as TaskStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["aberta", "em_andamento", "concluida"] as TaskStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Prioridade</Label>
            <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v as Prio })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} disabled={!draft.title.trim()}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </CardContent>
      </Card>

      {tasks.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-6 border border-dashed rounded-lg">
          Nenhuma tarefa adicionada. As tarefas são salvas apenas nesta sessão até a tabela de tarefas existir.
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.assignee || "Sem responsável"} · {t.due_date || "sem prazo"}
                  </p>
                </div>
                <Badge variant="outline" className={prioCls[t.priority]}>{t.priority}</Badge>
                <Badge variant="outline" className={statusCls[t.status]}>{statusLabel[t.status]}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setTasks((arr) => arr.filter((x) => x.id !== t.id))}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
