import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock, AlertTriangle, CheckCircle2, Clock3, Wallet, Plus, Paperclip,
  Trash2, ListChecks, CalendarDays, LayoutList, FileText, ExternalLink, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingState, EmptyState, ErrorState } from "@/components/DataStates";
import { cn } from "@/lib/utils";

type PlannerStatus = "pendente" | "em_aprovacao" | "pago" | "vencido" | "cancelado";

type PlannerRow = {
  id: string;
  user_id: string;
  supplier_name: string;
  supplier_id: string | null;
  description: string | null;
  amount: number;
  due_date: string;
  status: PlannerStatus;
  category: string | null;
  dre_group: string | null;
  account: string | null;
  business_unit: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<PlannerStatus, string> = {
  pendente: "Pendente",
  em_aprovacao: "Em aprovação",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

const STATUS_BADGE: Record<PlannerStatus, string> = {
  pendente: "bg-muted text-foreground border-border",
  em_aprovacao: "bg-warning/15 text-warning border-warning/30",
  pago: "bg-success/15 text-success border-success/30",
  vencido: "bg-destructive/15 text-destructive border-destructive/30",
  cancelado: "bg-muted/60 text-muted-foreground border-border",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtDateBR = (iso: string | null) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—";

function effectiveStatus(r: PlannerRow): PlannerStatus {
  if (r.status === "pago" || r.status === "cancelado" || r.status === "em_aprovacao") return r.status;
  if (r.due_date && r.due_date < today()) return "vencido";
  return "pendente";
}

const BUCKET = "devis-pdfs";
const FOLDER = "payment-planner";

async function uploadAttachment(file: File, userId: string) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${FOLDER}/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
  return {
    url: data?.signedUrl ?? path,
    name: file.name,
    type: file.type || ext,
    path,
  };
}

export function PaymentScheduler() {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlannerRow | null>(null);
  const [toDelete, setToDelete] = useState<PlannerRow | null>(null);

  const q = useQuery({
    queryKey: ["payment_planner"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_planner")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlannerRow[];
    },
  });

  const rows = q.data ?? [];

  const metrics = useMemo(() => {
    const t = today();
    const start = new Date(t + "T00:00:00");
    const weekEnd = addDays(start, 7).toISOString().slice(0, 10);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      .toISOString().slice(0, 10);

    let hoje = 0, hojeQ = 0;
    let semana = 0, semanaQ = 0;
    let mes = 0, mesQ = 0;
    let vencidos = 0, vencidosQ = 0;
    let totalPeriodo = 0;

    rows.forEach((r) => {
      const st = effectiveStatus(r);
      if (st === "pago" || st === "cancelado") return;
      const amt = Number(r.amount || 0);
      if (st === "vencido") { vencidos += amt; vencidosQ++; }
      if (r.due_date === t) { hoje += amt; hojeQ++; }
      if (r.due_date >= t && r.due_date <= weekEnd) { semana += amt; semanaQ++; }
      if (r.due_date >= t && r.due_date <= monthEnd) { mes += amt; mesQ++; totalPeriodo += amt; }
    });
    return { hoje, hojeQ, semana, semanaQ, mes, mesQ, vencidos, vencidosQ, totalPeriodo };
  }, [rows]);

  const groups = useMemo(() => {
    const t = today();
    const weekEnd = addDays(new Date(t + "T00:00:00"), 7).toISOString().slice(0, 10);
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString().slice(0, 10);

    const buckets: Record<string, PlannerRow[]> = {
      vencidos: [], hoje: [], semana: [], mes: [], futuros: [], pagos: [],
    };
    rows.forEach((r) => {
      const st = effectiveStatus(r);
      if (st === "pago") { buckets.pagos.push(r); return; }
      if (st === "vencido") { buckets.vencidos.push(r); return; }
      if (r.due_date === t) { buckets.hoje.push(r); return; }
      if (r.due_date > t && r.due_date <= weekEnd) { buckets.semana.push(r); return; }
      if (r.due_date > t && r.due_date <= monthEnd) { buckets.mes.push(r); return; }
      buckets.futuros.push(r);
    });
    return buckets;
  }, [rows]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("payment_planner").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento removido");
      qc.invalidateQueries({ queryKey: ["payment_planner"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PlannerStatus }) => {
      const patch: any = { status };
      if (status === "pago") patch.paid_at = new Date().toISOString();
      const { error } = await (supabase as any).from("payment_planner").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["payment_planner"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar"),
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold font-display flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Cronograma de Pagamentos
          </h2>
          <p className="text-sm text-muted-foreground">
            Planner financeiro corporativo — visão de pagamentos futuros e vencimentos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
            <Button
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              onClick={() => setView("list")}
              className="h-8"
            >
              <LayoutList className="h-4 w-4 mr-1.5" /> Lista
            </Button>
            <Button
              size="sm"
              variant={view === "calendar" ? "default" : "ghost"}
              onClick={() => setView("calendar")}
              className="h-8"
            >
              <CalendarDays className="h-4 w-4 mr-1.5" /> Calendário
            </Button>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo planejado
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard tone="primary" icon={<Wallet className="h-4 w-4" />} label="A pagar hoje"
          value={fmt(metrics.hoje)} hint={`${metrics.hojeQ} pagamento(s)`} />
        <KpiCard tone="warning" icon={<CalendarClock className="h-4 w-4" />} label="Esta semana"
          value={fmt(metrics.semana)} hint={`${metrics.semanaQ} pagamento(s)`} />
        <KpiCard tone="muted" icon={<ListChecks className="h-4 w-4" />} label="Este mês"
          value={fmt(metrics.mes)} hint={`${metrics.mesQ} pagamento(s)`} />
        <KpiCard tone="danger" icon={<AlertTriangle className="h-4 w-4" />} label="Vencidos"
          value={fmt(metrics.vencidos)} hint={`${metrics.vencidosQ} pagamento(s)`} />
        <KpiCard tone="success" icon={<Clock3 className="h-4 w-4" />} label="Total planejado no mês"
          value={fmt(metrics.totalPeriodo)} />
      </div>

      {q.isLoading ? (
        <Card><CardContent><LoadingState /></CardContent></Card>
      ) : q.isError ? (
        <Card><CardContent><ErrorState onRetry={() => q.refetch()} /></CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent>
          <EmptyState
            title="Nenhum pagamento planejado"
            description="Cadastre o primeiro pagamento planejado para começar."
          />
        </CardContent></Card>
      ) : view === "list" ? (
        <div className="space-y-4">
          <GroupSection title="Vencidos" tone="danger" rows={groups.vencidos}
            onEdit={(r) => { setEditing(r); setFormOpen(true); }}
            onStatus={(r, s) => statusMutation.mutate({ id: r.id, status: s })}
            onDelete={(r) => setToDelete(r)} />
          <GroupSection title="A pagar hoje" tone="primary" rows={groups.hoje}
            onEdit={(r) => { setEditing(r); setFormOpen(true); }}
            onStatus={(r, s) => statusMutation.mutate({ id: r.id, status: s })}
            onDelete={(r) => setToDelete(r)} />
          <GroupSection title="Esta semana" tone="warning" rows={groups.semana}
            onEdit={(r) => { setEditing(r); setFormOpen(true); }}
            onStatus={(r, s) => statusMutation.mutate({ id: r.id, status: s })}
            onDelete={(r) => setToDelete(r)} />
          <GroupSection title="Este mês" tone="muted" rows={groups.mes}
            onEdit={(r) => { setEditing(r); setFormOpen(true); }}
            onStatus={(r, s) => statusMutation.mutate({ id: r.id, status: s })}
            onDelete={(r) => setToDelete(r)} />
          <GroupSection title="Futuros (próximos meses)" tone="muted" rows={groups.futuros}
            onEdit={(r) => { setEditing(r); setFormOpen(true); }}
            onStatus={(r, s) => statusMutation.mutate({ id: r.id, status: s })}
            onDelete={(r) => setToDelete(r)} />
          <GroupSection title="Pagos" tone="success" rows={groups.pagos} collapsedDefault
            onEdit={(r) => { setEditing(r); setFormOpen(true); }}
            onStatus={(r, s) => statusMutation.mutate({ id: r.id, status: s })}
            onDelete={(r) => setToDelete(r)} />
        </div>
      ) : (
        <CalendarView rows={rows} onPick={(r) => { setEditing(r); setFormOpen(true); }} />
      )}

      <PlannerFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        editing={editing}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagamento planejado?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.supplier_name} · {fmt(Number(toDelete?.amount ?? 0))}
              <br />Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (toDelete) deleteMutation.mutate(toDelete.id); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ───────── Sub-components ───────── */

type Tone = "success" | "danger" | "warning" | "primary" | "muted";
const toneStyles: Record<Tone, { icon: string; ring: string }> = {
  success: { icon: "text-success bg-success/10", ring: "" },
  danger:  { icon: "text-destructive bg-destructive/10", ring: "" },
  warning: { icon: "text-warning bg-warning/10", ring: "" },
  primary: { icon: "text-primary bg-primary/10", ring: "ring-1 ring-primary/30" },
  muted:   { icon: "text-muted-foreground bg-muted", ring: "" },
};

function KpiCard({
  icon, label, value, hint, tone = "muted",
}: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: Tone }) {
  const t = toneStyles[tone];
  return (
    <Card className={cn("overflow-hidden", t.ring)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold tabular-nums mt-1 truncate">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
          </div>
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", t.icon)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function GroupSection({
  title, tone, rows, collapsedDefault, onEdit, onStatus, onDelete,
}: {
  title: string;
  tone: Tone;
  rows: PlannerRow[];
  collapsedDefault?: boolean;
  onEdit: (r: PlannerRow) => void;
  onStatus: (r: PlannerRow, s: PlannerStatus) => void;
  onDelete: (r: PlannerRow) => void;
}) {
  const [open, setOpen] = useState(!collapsedDefault);
  if (rows.length === 0) return null;
  const total = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  const t = toneStyles[tone];

  return (
    <Card>
      <CardContent className="p-0">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition"
        >
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", t.icon.replace("bg-", "bg-").split(" ")[1])} />
            <span className="font-semibold">{title}</span>
            <Badge variant="outline" className="text-xs">{rows.length}</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="tabular-nums font-semibold">{fmt(total)}</span>
            <span className="text-xs text-muted-foreground">{open ? "Recolher" : "Expandir"}</span>
          </div>
        </button>
        {open && (
          <div className="divide-y border-t">
            {rows.map((r) => {
              const st = effectiveStatus(r);
              return (
                <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-muted/20 items-center">
                  <div className="col-span-12 md:col-span-4 min-w-0">
                    <div className="font-medium truncate">{r.supplier_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.description || "—"}</div>
                  </div>
                  <div className="col-span-4 md:col-span-2 text-sm tabular-nums">
                    {fmtDateBR(r.due_date)}
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right tabular-nums font-semibold">
                    {fmt(Number(r.amount || 0))}
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Badge variant="outline" className={STATUS_BADGE[st]}>{STATUS_LABEL[st]}</Badge>
                  </div>
                  <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-1">
                    {r.attachment_url && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => window.open(r.attachment_url!, "_blank")}
                        title={r.attachment_name ?? "Anexo"}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    )}
                    <Select value={st} onValueChange={(v) => onStatus(r, v as PlannerStatus)}>
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_aprovacao">Em aprovação</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(r)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => onDelete(r)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarView({
  rows, onPick,
}: { rows: PlannerRow[]; onPick: (r: PlannerRow) => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate = useMemo(() => {
    const map = new Map<string, PlannerRow[]>();
    rows.forEach((r) => {
      const k = r.due_date;
      if (!k) return;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return map;
  }, [rows]);

  const cells: ({ date: string; rows: PlannerRow[] } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push({ date, rows: byDate.get(date) ?? [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const t = today();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold capitalize">{monthLabel}</h3>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month - 1, 1))}>
              ←
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const d = new Date();
              setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}>
              Hoje
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month + 1, 1))}>
              →
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-1">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="px-2 py-1 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={i} className="min-h-[88px] rounded-md bg-muted/20" />;
            const isToday = c.date === t;
            const totalDay = c.rows.reduce((a, r) => a + Number(r.amount || 0), 0);
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[88px] rounded-md border p-1.5 flex flex-col gap-1 bg-card",
                  isToday && "ring-1 ring-primary border-primary"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-semibold", isToday && "text-primary")}>
                    {Number(c.date.slice(-2))}
                  </span>
                  {c.rows.length > 0 && (
                    <span className="text-[10px] tabular-nums text-muted-foreground">{fmt(totalDay)}</span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {c.rows.slice(0, 3).map((r) => {
                    const st = effectiveStatus(r);
                    return (
                      <button
                        key={r.id}
                        onClick={() => onPick(r)}
                        className={cn(
                          "text-[10px] truncate text-left px-1 py-0.5 rounded border",
                          STATUS_BADGE[st]
                        )}
                        title={`${r.supplier_name} · ${fmt(Number(r.amount || 0))}`}
                      >
                        {r.supplier_name}
                      </button>
                    );
                  })}
                  {c.rows.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1">
                      +{c.rows.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PlannerFormDialog({
  open, onOpenChange, editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: PlannerRow | null;
}) {
  const qc = useQueryClient();
  const [supplierName, setSupplierName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [dueDate, setDueDate] = useState(today());
  const [status, setStatus] = useState<PlannerStatus>("pendente");
  const [category, setCategory] = useState("");
  const [dreGroup, setDreGroup] = useState("");
  const [account, setAccount] = useState("");
  const [businessUnit, setBusinessUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<{ url: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setSupplierName(editing.supplier_name ?? "");
        setDescription(editing.description ?? "");
        setAmount(String(editing.amount ?? ""));
        setDueDate(editing.due_date ?? today());
        setStatus(editing.status ?? "pendente");
        setCategory(editing.category ?? "");
        setDreGroup(editing.dre_group ?? "");
        setAccount(editing.account ?? "");
        setBusinessUnit(editing.business_unit ?? "");
        setNotes(editing.notes ?? "");
        setExistingAttachment(
          editing.attachment_url
            ? { url: editing.attachment_url, name: editing.attachment_name ?? "Anexo" }
            : null
        );
        setFile(null);
      } else {
        setSupplierName(""); setDescription(""); setAmount(""); setDueDate(today());
        setStatus("pendente"); setCategory(""); setDreGroup(""); setAccount("");
        setBusinessUnit(""); setNotes(""); setFile(null); setExistingAttachment(null);
      }
    }
  }, [open, editing]);

  const onSubmit = async () => {
    if (!supplierName.trim()) { toast.error("Informe o fornecedor"); return; }
    const amt = Number(amount.replace(",", "."));
    if (!amt || amt <= 0) { toast.error("Informe um valor válido"); return; }
    if (!dueDate) { toast.error("Informe o vencimento"); return; }

    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");

      let attachmentPatch: Partial<PlannerRow> = {};
      if (file) {
        const up = await uploadAttachment(file, userId);
        attachmentPatch = {
          attachment_url: up.url,
          attachment_name: up.name,
          attachment_type: up.type,
        };
      }

      const payload: any = {
        user_id: userId,
        supplier_name: supplierName.trim(),
        description: description.trim() || null,
        amount: amt,
        due_date: dueDate,
        status,
        category: category.trim() || null,
        dre_group: dreGroup.trim() || null,
        account: account.trim() || null,
        business_unit: businessUnit.trim() || null,
        notes: notes.trim() || null,
        ...attachmentPatch,
        ...(status === "pago" ? { paid_at: new Date().toISOString() } : {}),
      };

      if (editing) {
        const { error } = await (supabase as any)
          .from("payment_planner")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Pagamento atualizado");
      } else {
        const { error } = await (supabase as any)
          .from("payment_planner")
          .insert(payload);
        if (error) throw error;
        toast.success("Pagamento planejado criado");
      }
      qc.invalidateQueries({ queryKey: ["payment_planner"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar pagamento planejado" : "Novo pagamento planejado"}</DialogTitle>
          <DialogDescription>
            Cadastre um pagamento futuro com fornecedor, vencimento, classificação e anexo (boleto, NF ou comprovante).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 py-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Fornecedor *</Label>
            <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Razão social ou nome do fornecedor" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Mensalidade software, Aluguel, Frete..." />
          </div>
          <div className="space-y-1.5">
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" inputMode="decimal"
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label>Vencimento *</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as PlannerStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_aprovacao">Em aprovação</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unidade de negócio</Label>
            <Input value={businessUnit} onChange={(e) => setBusinessUnit(e.target.value)}
              placeholder="Ex.: Matriz" />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex.: Serviços, Aluguel..." />
          </div>
          <div className="space-y-1.5">
            <Label>Grupo DRE</Label>
            <Input value={dreGroup} onChange={(e) => setDreGroup(e.target.value)}
              placeholder="Ex.: Despesas Administrativas" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Conta / Subconta gerencial</Label>
            <Input value={account} onChange={(e) => setAccount(e.target.value)}
              placeholder="Ex.: 3.1.02 - Aluguel" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Notas internas, condições, etc." />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" /> Anexo (boleto, NF ou comprovante)
            </Label>
            <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {existingAttachment && !file && (
              <a href={existingAttachment.url} target="_blank" rel="noreferrer"
                className="text-xs text-primary flex items-center gap-1 hover:underline">
                <ExternalLink className="h-3 w-3" /> {existingAttachment.name}
              </a>
            )}
            <p className="text-[11px] text-muted-foreground">
              A leitura inteligente do anexo (sugerir fornecedor, valor e vencimento automaticamente) chega na fase 2.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? "Salvar alterações" : "Criar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
