import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, User, Calendar, Tag, AlertTriangle, Wallet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceLike } from "./status";

type Prio = "baixa" | "media" | "alta";
type TaskStatus = "aberta" | "em_andamento" | "concluida";
type BillingType = "percent" | "amount";

type Milestone = {
  id: string;
  service_id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: Prio;
  billable: boolean;
  billing_type: BillingType | null;
  billing_percent: number | null;
  billing_amount: number | null;
  charge_generated: boolean;
  charge_entry_id: string | null;
  completed_at: string | null;
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

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProcessoTarefas({ service }: { service?: ServiceLike | null }) {
  const qc = useQueryClient();
  const serviceId = service?.id ?? null;

  const list = useQuery({
    queryKey: ["service-milestones", serviceId],
    enabled: !!serviceId,
    queryFn: async (): Promise<Milestone[]> => {
      const { data, error } = await supabase
        .from("service_milestones" as any)
        .select("*")
        .eq("service_id", serviceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Milestone[];
    },
  });

  const [draft, setDraft] = useState({
    title: "",
    assignee: "",
    due_date: "",
    status: "aberta" as TaskStatus,
    priority: "media" as Prio,
    billable: false,
    billing_type: "percent" as BillingType,
    billing_percent: "" as string,
    billing_amount: "" as string,
  });

  const reset = () =>
    setDraft({
      title: "",
      assignee: "",
      due_date: "",
      status: "aberta",
      priority: "media",
      billable: false,
      billing_type: "percent",
      billing_percent: "",
      billing_amount: "",
    });

  const add = useMutation({
    mutationFn: async () => {
      if (!serviceId) throw new Error("Operação não carregada.");
      if (!draft.title.trim()) throw new Error("Informe o título da etapa.");
      const payload: any = {
        service_id: serviceId,
        title: draft.title.trim(),
        assignee: draft.assignee || null,
        due_date: draft.due_date || null,
        status: draft.status,
        priority: draft.priority,
        billable: draft.billable,
        billing_type: draft.billable ? draft.billing_type : null,
        billing_percent:
          draft.billable && draft.billing_type === "percent" && draft.billing_percent
            ? Number(draft.billing_percent)
            : null,
        billing_amount:
          draft.billable && draft.billing_type === "amount" && draft.billing_amount
            ? Number(draft.billing_amount)
            : null,
      };
      const { error } = await supabase.from("service_milestones" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      reset();
      qc.invalidateQueries({ queryKey: ["service-milestones", serviceId] });
      qc.invalidateQueries({ queryKey: ["devis-payment-summary"] });
      toast.success("Etapa adicionada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao adicionar etapa"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Milestone> }) => {
      const { error } = await supabase
        .from("service_milestones" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["service-milestones", serviceId] });
      qc.invalidateQueries({ queryKey: ["devis-payment-summary"] });
      if (vars.patch.status === "concluida") {
        toast.success("Etapa concluída");
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar etapa"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_milestones" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-milestones", serviceId] });
      toast.success("Etapa removida");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  const tasks = list.data ?? [];

  if (!serviceId) {
    return (
      <div className="text-center text-xs text-muted-foreground py-6 border border-dashed rounded-lg">
        Abra um processo para gerenciar suas etapas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="py-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" /> Etapa *
              </Label>
              <Textarea
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Descreva a etapa detalhadamente..."
                className="min-h-[80px] resize-y bg-background"
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
              <Label className="text-sm font-semibold">Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as TaskStatus })}
              >
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
              <Select
                value={draft.priority}
                onValueChange={(v) => setDraft({ ...draft, priority: v as Prio })}
              >
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 rounded-lg border bg-background/60 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Etapa faturável</Label>
                </div>
                <Switch
                  checked={draft.billable}
                  onCheckedChange={(v) => setDraft({ ...draft, billable: !!v })}
                />
              </div>
              {draft.billable ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={draft.billing_type}
                      onValueChange={(v) =>
                        setDraft({ ...draft, billing_type: v as BillingType })
                      }
                    >
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">% do Devis</SelectItem>
                        <SelectItem value="amount">Valor fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {draft.billing_type === "percent" ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Percentual (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={draft.billing_percent}
                        onChange={(e) =>
                          setDraft({ ...draft, billing_percent: e.target.value })
                        }
                        placeholder="ex.: 30"
                        className="bg-background"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft.billing_amount}
                        onChange={(e) =>
                          setDraft({ ...draft, billing_amount: e.target.value })
                        }
                        placeholder="ex.: 1500.00"
                        className="bg-background"
                      />
                    </div>
                  )}
                  <p className="md:col-span-3 text-[11px] text-muted-foreground">
                    Ao concluir esta etapa, será criado um lançamento em Contas a Receber com status
                    “Aguardando envio”. Nenhuma cobrança é enviada automaticamente.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => add.mutate()}
              disabled={!draft.title.trim() || add.isPending}
              className="px-8"
            >
              <Plus className="h-4 w-4 mr-2" />
              {add.isPending ? "Adicionando..." : "Adicionar Etapa"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {list.isLoading ? (
        <div className="text-center text-xs text-muted-foreground py-6">Carregando etapas…</div>
      ) : tasks.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-6 border border-dashed rounded-lg">
          Nenhuma etapa cadastrada para esta operação.
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{t.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {t.assignee || "Sem responsável"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{" "}
                      {t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : "Sem prazo"}
                    </span>
                    {t.billable ? (
                      <span className="flex items-center gap-1 text-primary">
                        <Wallet className="h-3 w-3" />
                        {t.billing_type === "percent"
                          ? `${t.billing_percent ?? 0}% do Devis`
                          : brl(Number(t.billing_amount ?? 0))}
                      </span>
                    ) : null}
                    {t.charge_generated ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Cobrança gerada
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={cn("text-[10px] px-2 py-0", prioCls[t.priority])}>
                    {t.priority}
                  </Badge>
                  <Select
                    value={t.status}
                    onValueChange={(v) =>
                      update.mutate({ id: t.id, patch: { status: v as TaskStatus } })
                    }
                  >
                    <SelectTrigger
                      className={cn("h-7 w-36 text-[11px]", statusCls[t.status])}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["aberta", "em_andamento", "concluida"] as TaskStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => remove.mutate(t.id)}
                >
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
