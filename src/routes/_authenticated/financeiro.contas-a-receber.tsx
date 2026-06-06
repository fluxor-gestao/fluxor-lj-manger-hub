import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Search, Filter, MoreHorizontal, Eye, FileText, Send, DollarSign,
  AlertTriangle, CalendarClock, Wallet, CheckCircle2, ListChecks,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LoadingState, EmptyState, ErrorState } from "@/components/DataStates";
import { useFinanceiroCatalogs } from "@/hooks/useFinanceiroCatalogs";
import { CobrancaDetailSheet, type CobrancaRow } from "@/components/financeiro/CobrancaDetailSheet";

export const Route = createFileRoute("/_authenticated/financeiro/contas-a-receber")({
  component: ContasAReceberPage,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, d: number) => {
  const dt = new Date(iso + "T00:00:00");
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};
const fmtDateBR = (iso: string | null) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—";

type Row = {
  id: string;
  due_date: string | null;
  entry_date: string;
  competence_month: string | null;
  movement_description: string | null;
  counterparty_name: string | null;
  amount_in: number | null;
  total_brl: number | null;
  paid_amount: number | null;
  open_amount: number | null;
  payment_status: string | null;
  document_reference: string | null;
  notes: string | null;
  client_id: string | null;
  client: { name: string } | null;
};

const COLS =
  "id, due_date, entry_date, competence_month, movement_description, counterparty_name, amount_in, total_brl, paid_amount, open_amount, payment_status, document_reference, notes, client_id, client:clients(name)";

type Status = "pago" | "parcial" | "vencido" | "aberto";

function statusOf(r: Row): Status {
  if (r.payment_status === "pago" || (Number(r.open_amount ?? 0)) <= 0.0049) return "pago";
  if (
    r.payment_status === "parcial" ||
    (Number(r.paid_amount ?? 0) > 0 && Number(r.open_amount ?? 0) > 0)
  ) return "parcial";
  if (r.due_date && r.due_date < today()) return "vencido";
  return "aberto";
}

const statusBadge: Record<Status, string> = {
  pago: "bg-success/15 text-success border-success/30",
  parcial: "bg-warning/15 text-warning border-warning/30",
  vencido: "bg-destructive/15 text-destructive border-destructive/30",
  aberto: "bg-muted text-muted-foreground border-border",
};

const statusLabel: Record<Status, string> = {
  pago: "Pago",
  parcial: "Parcial",
  vencido: "Vencido",
  aberto: "Em aberto",
};

function ContasAReceberPage() {
  const navigate = useNavigate();
  const { clients } = useFinanceiroCatalogs();

  // Filtros
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dueFrom, setDueFrom] = useState<string>("");
  const [dueTo, setDueTo] = useState<string>("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(true);

  const q = useQuery({
    queryKey: ["contas-a-receber", "v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_entries")
        .select(COLS)
        .eq("entry_type", "receita" as any)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const allRows = q.data ?? [];

  const filtered = useMemo(() => {
    const t = today();
    const s = search.trim().toLowerCase();
    return allRows.filter((r) => {
      const st = statusOf(r);
      if (onlyOpen && st === "pago") return false;
      if (onlyOverdue && st !== "vencido") return false;
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (clientFilter !== "all" && r.client_id !== clientFilter) return false;
      if (dueFrom && (!r.due_date || r.due_date < dueFrom)) return false;
      if (dueTo && (!r.due_date || r.due_date > dueTo)) return false;
      if (s) {
        const hay = `${r.movement_description ?? ""} ${r.counterparty_name ?? ""} ${r.client?.name ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      void t;
      return true;
    });
  }, [allRows, search, clientFilter, statusFilter, dueFrom, dueTo, onlyOverdue, onlyOpen]);

  // Métricas (calculadas sobre todos os recebíveis, não os filtrados, para visão executiva)
  const metrics = useMemo(() => {
    const t = today();
    const in7 = addDays(t, 7);
    const monthPrefix = t.slice(0, 7);
    let totalAberto = 0;
    let vencidoVal = 0;
    let vencidoQtd = 0;
    let a7Val = 0;
    let a7Qtd = 0;
    let recebidoMes = 0;
    let pendentesQtd = 0;
    for (const r of allRows) {
      const st = statusOf(r);
      const open = Number(r.open_amount ?? 0);
      const paid = Number(r.paid_amount ?? 0);
      if (st !== "pago") {
        totalAberto += open;
        pendentesQtd += 1;
        if (st === "vencido") { vencidoVal += open; vencidoQtd += 1; }
        if (r.due_date && r.due_date >= t && r.due_date <= in7) { a7Val += open; a7Qtd += 1; }
      }
      // Recebido no mês — aproximação por entry_date do recebível com pagamento
      if (paid > 0 && r.entry_date?.startsWith(monthPrefix)) {
        recebidoMes += paid;
      }
    }
    return { totalAberto, vencidoVal, vencidoQtd, a7Val, a7Qtd, recebidoMes, pendentesQtd };
  }, [allRows]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        const total = Number(r.total_brl ?? r.amount_in ?? 0);
        const paid = Number(r.paid_amount ?? 0);
        const open = Number(r.open_amount ?? Math.max(0, total - paid));
        acc.total += total; acc.paid += paid; acc.open += open;
        return acc;
      },
      { total: 0, paid: 0, open: 0 },
    );
  }, [filtered]);

  const clearFilters = () => {
    setSearch(""); setClientFilter("all"); setStatusFilter("all");
    setDueFrom(""); setDueTo(""); setOnlyOverdue(false); setOnlyOpen(true);
  };

  // Placeholder actions
  const act = (label: string, r: Row) => {
    toast.info(`${label} — em breve`, {
      description: `${r.client?.name ?? r.counterparty_name ?? "Cliente"} · ${fmt(Number(r.open_amount ?? 0))}`,
    });
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/financeiro" })}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">Contas a Receber</h1>
            <p className="text-sm text-muted-foreground">
              Controle de recebíveis, cobranças e inadimplência
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("Exportar — em breve")}>
            <FileText className="h-4 w-4 mr-2" /> Exportar
          </Button>
          <Button onClick={() => toast.info("Nova cobrança — em breve")}>
            <Send className="h-4 w-4 mr-2" /> Nova cobrança
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard tone="primary" icon={<Wallet className="h-4 w-4" />} label="Total em aberto" value={fmt(metrics.totalAberto)} />
        <KpiCard tone="danger" icon={<AlertTriangle className="h-4 w-4" />} label="Vencidos" value={fmt(metrics.vencidoVal)} hint={`${metrics.vencidoQtd} cobrança(s)`} />
        <KpiCard tone="warning" icon={<CalendarClock className="h-4 w-4" />} label="A vencer (7 dias)" value={fmt(metrics.a7Val)} hint={`${metrics.a7Qtd} cobrança(s)`} />
        <KpiCard tone="success" icon={<CheckCircle2 className="h-4 w-4" />} label="Recebidos no mês" value={fmt(metrics.recebidoMes)} />
        <KpiCard tone="muted" icon={<ListChecks className="h-4 w-4" />} label="Cobranças pendentes" value={String(metrics.pendentesQtd)} />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Filter className="h-3.5 w-3.5" /> Filtros
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar</Button>
          </div>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar descrição ou cliente..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="aberto">Em aberto</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} placeholder="Vencimento inicial" />
            <Input type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} placeholder="Vencimento final" />
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={onlyOverdue} onCheckedChange={(v) => setOnlyOverdue(!!v)} />
              Apenas vencidos
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={onlyOpen} onCheckedChange={(v) => setOnlyOpen(!!v)} />
              Apenas em aberto
            </label>
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} de {allRows.length} cobrança(s)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      {q.isLoading ? (
        <Card><CardContent><LoadingState /></CardContent></Card>
      ) : q.isError ? (
        <Card><CardContent><ErrorState onRetry={() => q.refetch()} /></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent>
          <EmptyState title="Nenhuma cobrança encontrada" description="Ajuste os filtros para visualizar os recebíveis." />
        </CardContent></Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Descrição</TableHead>
                <TableHead className="font-semibold">Vencimento</TableHead>
                <TableHead className="font-semibold text-right">Valor total</TableHead>
                <TableHead className="font-semibold text-right">Recebido</TableHead>
                <TableHead className="font-semibold text-right">Saldo aberto</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const total = Number(r.total_brl ?? r.amount_in ?? 0);
                const paid = Number(r.paid_amount ?? 0);
                const open = Number(r.open_amount ?? Math.max(0, total - paid));
                const st = statusOf(r);
                const cliente = r.client?.name || r.counterparty_name || "—";
                return (
                  <TableRow key={r.id} className="even:bg-muted/20 hover:bg-muted/40">
                    <TableCell className="py-2 font-medium">{cliente}</TableCell>
                    <TableCell className="py-2 max-w-[280px] truncate" title={r.movement_description ?? ""}>
                      {r.movement_description ?? "—"}
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap text-xs tabular-nums">
                      {fmtDateBR(r.due_date)}
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums">{fmt(total)}</TableCell>
                    <TableCell className="py-2 text-right tabular-nums text-success">
                      {paid ? fmt(paid) : "—"}
                    </TableCell>
                    <TableCell className="py-2 text-right font-semibold tabular-nums">{fmt(open)}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className={statusBadge[st]}>{statusLabel[st]}</Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => act("Ver detalhes", r)}>
                            <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => act("Gerar cobrança", r)}>
                            <FileText className="h-4 w-4 mr-2" /> Gerar cobrança
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => act("Enviar cobrança", r)}>
                            <Send className="h-4 w-4 mr-2" /> Enviar cobrança
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => act("Registrar pagamento", r)}>
                            <DollarSign className="h-4 w-4 mr-2" /> Registrar pagamento
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell colSpan={3} className="py-2">Totais (filtrados)</TableCell>
                <TableCell className="py-2 text-right tabular-nums">{fmt(totals.total)}</TableCell>
                <TableCell className="py-2 text-right tabular-nums text-success">{fmt(totals.paid)}</TableCell>
                <TableCell className="py-2 text-right tabular-nums">{fmt(totals.open)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

type Tone = "success" | "danger" | "warning" | "primary" | "muted";
const toneStyles: Record<Tone, { icon: string; bar: string; ring: string }> = {
  success: { icon: "text-success bg-success/10", bar: "bg-success", ring: "" },
  danger:  { icon: "text-destructive bg-destructive/10", bar: "bg-destructive", ring: "" },
  warning: { icon: "text-warning bg-warning/10", bar: "bg-warning", ring: "" },
  primary: { icon: "text-primary bg-primary/10", bar: "bg-primary", ring: "ring-1 ring-primary/30" },
  muted:   { icon: "text-muted-foreground bg-muted", bar: "bg-muted-foreground/40", ring: "" },
};

function KpiCard({
  icon, label, value, hint, tone = "muted",
}: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: Tone }) {
  const t = toneStyles[tone];
  return (
    <Card className={`relative overflow-hidden transition-shadow hover:shadow-md ${t.ring}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${t.bar}`} aria-hidden />
      <CardContent className="pt-5 pb-4 pl-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${t.icon}`}>{icon}</span>
        </div>
        <p className="text-xl font-bold font-display tabular-nums leading-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
