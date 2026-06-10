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
import { cn } from "@/lib/utils";

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
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="py-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" /> Tarefa *
              </Label>
              <Textarea 
                value={draft.title} 
                onChange={(e) => setDraft({ ...draft, title: e.target.value })} 
                placeholder="Descreva a tarefa detalhadamente..."
                className="min-h-[100px] resize-y bg-background"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" /> Responsável
              </Label>
              <Input 
                value={draft.assignee} 
                onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} 
                placeholder="Nome do responsável"
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Prazo
              </Label>
              <Input 
                type="date" 
                value={draft.due_date} 
                onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} 
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" /> Status
              </Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as TaskStatus })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["aberta", "em_andamento", "concluida"] as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Prioridade
              </Label>
              <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v as Prio })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={add} disabled={!draft.title.trim()} className="px-8">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Tarefa
            </Button>
          </div>
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
              <CardContent className="py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{t.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {t.assignee || "Sem responsável"}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : "Sem prazo"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={cn("text-[10px] px-2 py-0", prioCls[t.priority])}>{t.priority}</Badge>
                  <Badge variant="outline" className={cn("text-[10px] px-2 py-0", statusCls[t.status])}>{statusLabel[t.status]}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
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
