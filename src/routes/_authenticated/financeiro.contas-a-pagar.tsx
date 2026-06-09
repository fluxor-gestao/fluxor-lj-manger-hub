import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Search, Filter, MoreHorizontal, Eye, FileText, DollarSign, CheckCircle2,
  AlertTriangle, CalendarClock, Wallet, ListChecks, Receipt, Trash2, Settings2,
  ShieldCheck, TrendingDown, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { LoadingState, EmptyState, ErrorState } from "@/components/DataStates";
import { useFinanceiroCatalogs } from "@/hooks/useFinanceiroCatalogs";
import { RegisterPaymentDialog, type PayableEntry } from "@/components/financeiro/RegisterPaymentDialog";
import { useCompany } from "@/contexts/CompanyContext";
import { ActiveCompanyBanner } from "@/components/ActiveCompanyBanner";

type Coverage = "coberto" | "apertado" | "sem";
const COVERAGE_LABEL: Record<Coverage, string> = {
  coberto: "Coberto", apertado: "Apertado", sem: "Sem cobertura",
};
const COVERAGE_BADGE: Record<Coverage, string> = {
  coberto: "bg-success/15 text-success border-success/30",
  apertado: "bg-warning/15 text-warning border-warning/30",
  sem: "bg-destructive/15 text-destructive border-destructive/30",
};

const LS_AVAILABLE = "cap.availableBalance";
const LS_MIN = "cap.minBalance";

function useCashSettings() {
  const [available, setAvailable] = useState(0);
  const [minBalance, setMinBalance] = useState(0);
  useEffect(() => {
    try {
      setAvailable(Number(localStorage.getItem(LS_AVAILABLE) ?? 0) || 0);
      setMinBalance(Number(localStorage.getItem(LS_MIN) ?? 0) || 0);
    } catch {}
  }, []);
  const save = (a: number, m: number) => {
    setAvailable(a); setMinBalance(m);
    try {
      localStorage.setItem(LS_AVAILABLE, String(a));
      localStorage.setItem(LS_MIN, String(m));
    } catch {}
  };
  return { available, minBalance, save, configured: available > 0 || minBalance > 0 };
}

export const Route = createFileRoute("/_authenticated/financeiro/contas-a-pagar")({
  component: ContasAPagarPage,
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
  amount_out: number | null;
  total_brl: number | null;
  paid_amount: number | null;
  open_amount: number | null;
  payment_status: string | null;
  document_reference: string | null;
  notes: string | null;
  supplier_id: string | null;
  supplier: { name: string } | null;
};

const COLS =
  "id, due_date, entry_date, competence_month, movement_description, counterparty_name, amount_out, total_brl, paid_amount, open_amount, payment_status, document_reference, notes, supplier_id, supplier:suppliers(name)";

type Status = "pago" | "parcial" | "vencido" | "aberto";

function statusOf(r: Row): Status {
  if (r.payment_status === "pago" || Number(r.open_amount ?? 0) <= 0.0049) return "pago";
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
  pago: "Pago", parcial: "Parcial", vencido: "Vencido", aberto: "Em aberto",
};

function ContasAPagarPage() {
  const navigate = useNavigate();
  const { suppliers } = useFinanceiroCatalogs();
  const queryClient = useQueryClient();

  // Pagamento
  const [payRow, setPayRow] = useState<Row | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento excluído");
      queryClient.invalidateQueries({ queryKey: ["contas-a-pagar"] });
      setToDelete(null);
    },
    onError: (e: any) => toast.error("Erro ao excluir", { description: e?.message }),
  });

  // Filtros
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dueFrom, setDueFrom] = useState<string>("");
  const [dueTo, setDueTo] = useState<string>("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(true);

  const q = useQuery({
    queryKey: ["contas-a-pagar", "v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_entries")
        .select(COLS)
        .eq("entry_type", "despesa" as any)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const allRows = q.data ?? [];

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return allRows.filter((r) => {
      const st = statusOf(r);
      if (onlyOpen && st === "pago") return false;
      if (onlyOverdue && st !== "vencido") return false;
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (supplierFilter !== "all" && r.supplier_id !== supplierFilter) return false;
      if (dueFrom && (!r.due_date || r.due_date < dueFrom)) return false;
      if (dueTo && (!r.due_date || r.due_date > dueTo)) return false;
      if (s) {
        const hay = `${r.movement_description ?? ""} ${r.counterparty_name ?? ""} ${r.supplier?.name ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [allRows, search, supplierFilter, statusFilter, dueFrom, dueTo, onlyOverdue, onlyOpen]);

  const metrics = useMemo(() => {
    const t = today();
    const in7 = addDays(t, 7);
    const monthPrefix = t.slice(0, 7);
    let totalAberto = 0, vencidoVal = 0, vencidoQtd = 0;
    let a7Val = 0, a7Qtd = 0, pagoMes = 0, pendentesQtd = 0;
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
      if (paid > 0 && r.entry_date?.startsWith(monthPrefix)) {
        pagoMes += paid;
      }
    }
    return { totalAberto, vencidoVal, vencidoQtd, a7Val, a7Qtd, pagoMes, pendentesQtd };
  }, [allRows]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        const total = Number(r.total_brl ?? r.amount_out ?? 0);
        const paid = Number(r.paid_amount ?? 0);
        const open = Number(r.open_amount ?? Math.max(0, total - paid));
        acc.total += total; acc.paid += paid; acc.open += open;
        return acc;
      },
      { total: 0, paid: 0, open: 0 },
    );
  }, [filtered]);

  const clearFilters = () => {
    setSearch(""); setSupplierFilter("all"); setStatusFilter("all");
    setDueFrom(""); setDueTo(""); setOnlyOverdue(false); setOnlyOpen(true);
  };

  // Cash health
  const cash = useCashSettings();
  const [cashOpen, setCashOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<Row | null>(null);

  const openByDue = useMemo(
    () =>
      allRows
        .filter((r) => statusOf(r) !== "pago")
        .slice()
        .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")),
    [allRows],
  );

  const coverage = useMemo(() => {
    const map = new Map<string, Coverage>();
    let cum = 0;
    for (const r of openByDue) {
      const open = Number(r.open_amount ?? 0);
      const prev = cum;
      cum += open;
      if (cum <= cash.available) map.set(r.id, "coberto");
      else if (prev < cash.available) map.set(r.id, "apertado");
      else map.set(r.id, "sem");
    }
    return map;
  }, [openByDue, cash.available]);

  const previstoTotal = metrics.totalAberto;
  const previsto7d = metrics.a7Val;
  const saldoProjetado = cash.available - previstoTotal;
  const deficit = Math.max(0, previstoTotal - cash.available);

  const health: "saudavel" | "atencao" | "insuficiente" = !cash.configured
    ? "atencao"
    : cash.available < previstoTotal || cash.available < previsto7d
      ? "insuficiente"
      : cash.available < cash.minBalance
        ? "atencao"
        : "saudavel";

  const insights = useMemo(() => {
    let semQtd = 0, semValor = 0, apertadoQtd = 0, apertadoSemCob = 0;
    const criticas: Row[] = [];
    const t = today();
    const lim = addDays(t, 7);
    let acc = 0;
    for (const r of openByDue) {
      const c = coverage.get(r.id);
      const open = Number(r.open_amount ?? 0);
      if (c === "sem") { semQtd += 1; semValor += open; }
      if (c === "apertado") {
        apertadoQtd += 1;
        apertadoSemCob += Math.max(0, (acc + open) - cash.available);
      }
      acc += open;
      if ((c === "sem" || c === "apertado") && r.due_date && r.due_date >= t && r.due_date <= lim) {
        criticas.push(r);
      }
    }
    return {
      fundosInsuficientes: health === "insuficiente",
      emRisco: semQtd + apertadoQtd,
      semCobertura: semValor + apertadoSemCob,
      criticas: criticas.slice(0, 5),
    };
  }, [openByDue, coverage, cash.available, health]);



  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/financeiro" })}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">Contas a Pagar</h1>
            <p className="text-sm text-muted-foreground">
              Controle de fornecedores, vencimentos e pagamentos
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCashOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" /> Configurar caixa
          </Button>
          <Button variant="outline" onClick={() => toast.info("Exportar — em breve")}>
            <FileText className="h-4 w-4 mr-2" /> Exportar
          </Button>
          <Button onClick={() => toast.info("Novo pagamento — em breve")}>
            <DollarSign className="h-4 w-4 mr-2" /> Novo pagamento
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard tone="primary" icon={<Wallet className="h-4 w-4" />} label="Total em aberto" value={fmt(metrics.totalAberto)} />
        <KpiCard tone="danger" icon={<AlertTriangle className="h-4 w-4" />} label="Vencidos" value={fmt(metrics.vencidoVal)} hint={`${metrics.vencidoQtd} pagamento(s)`} />
        <KpiCard tone="warning" icon={<CalendarClock className="h-4 w-4" />} label="A vencer (7 dias)" value={fmt(metrics.a7Val)} hint={`${metrics.a7Qtd} pagamento(s)`} />
        <KpiCard tone="success" icon={<CheckCircle2 className="h-4 w-4" />} label="Pagos no mês" value={fmt(metrics.pagoMes)} />
        <KpiCard tone="muted" icon={<ListChecks className="h-4 w-4" />} label="Pagamentos pendentes" value={String(metrics.pendentesQtd)} />
      </div>

      {/* Saúde de Caixa */}
      <CashHealthCard
        configured={cash.configured}
        health={health}
        available={cash.available}
        minBalance={cash.minBalance}
        previstoTotal={previstoTotal}
        saldoProjetado={saldoProjetado}
        deficit={deficit}
        onConfigure={() => setCashOpen(true)}
      />


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
                placeholder="Buscar descrição ou fornecedor..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger><SelectValue placeholder="Fornecedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os fornecedores</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
            <Input type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} />
            <Input type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} />
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
              {filtered.length} de {allRows.length} pagamento(s)
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
          <EmptyState title="Nenhum pagamento encontrado" description="Ajuste os filtros para visualizar as contas a pagar." />
        </CardContent></Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Fornecedor</TableHead>
                <TableHead className="font-semibold">Descrição</TableHead>
                <TableHead className="font-semibold">Vencimento</TableHead>
                <TableHead className="font-semibold text-right">Valor total</TableHead>
                <TableHead className="font-semibold text-right">Pago</TableHead>
                <TableHead className="font-semibold text-right">Saldo aberto</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Impacto no Caixa</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const total = Number(r.total_brl ?? r.amount_out ?? 0);
                const paid = Number(r.paid_amount ?? 0);
                const open = Number(r.open_amount ?? Math.max(0, total - paid));
                const st = statusOf(r);
                const fornecedor = r.supplier?.name || r.counterparty_name || "—";
                const cov = coverage.get(r.id);
                return (
                  <TableRow key={r.id} className="even:bg-muted/20 hover:bg-muted/40">
                    <TableCell className="py-2 font-medium">{fornecedor}</TableCell>
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
                    <TableCell className="py-2">
                      {cov && cash.configured ? (
                        <Badge variant="outline" className={COVERAGE_BADGE[cov]}>{COVERAGE_LABEL[cov]}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setDetailRow(r)}>
                            <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPayRow(r)}>
                            <DollarSign className="h-4 w-4 mr-2" /> Registrar pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPayRow(r)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como pago
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toast.info("Ver comprovante — em breve")}>
                            <Receipt className="h-4 w-4 mr-2" /> Ver comprovante
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setToDelete(r)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
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
                <TableCell colSpan={3} />
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Insights de Caixa */}
      {cash.configured && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Activity className="h-3.5 w-3.5" /> Insights de Caixa
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                tone={insights.fundosInsuficientes ? "danger" : "success"}
                icon={insights.fundosInsuficientes ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                label="Fundos insuficientes"
                value={insights.fundosInsuficientes ? "Sim" : "Não"}
              />
              <KpiCard
                tone={insights.emRisco > 0 ? "warning" : "muted"}
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Pagamentos em risco"
                value={String(insights.emRisco)}
              />
              <KpiCard
                tone={insights.semCobertura > 0 ? "danger" : "muted"}
                icon={<TrendingDown className="h-4 w-4" />}
                label="Total sem cobertura"
                value={fmt(insights.semCobertura)}
              />
              <KpiCard
                tone={insights.criticas.length > 0 ? "warning" : "muted"}
                icon={<CalendarClock className="h-4 w-4" />}
                label="Críticas (7 dias)"
                value={String(insights.criticas.length)}
              />
            </div>
            {insights.criticas.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-medium text-muted-foreground">Contas críticas dos próximos 7 dias</p>
                <div className="rounded-md border divide-y">
                  {insights.criticas.map((r) => {
                    const cov = coverage.get(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => setDetailRow(r)}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted/40 text-left"
                      >
                        <span className="truncate">
                          <span className="font-medium">{r.supplier?.name || r.counterparty_name || "—"}</span>
                          <span className="text-muted-foreground"> · venc. {fmtDateBR(r.due_date)}</span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="tabular-nums font-semibold">{fmt(Number(r.open_amount ?? 0))}</span>
                          {cov && <Badge variant="outline" className={COVERAGE_BADGE[cov]}>{COVERAGE_LABEL[cov]}</Badge>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}



      <RegisterPaymentDialog
        entry={payRow as PayableEntry | null}
        open={!!payRow}
        onOpenChange={(o) => { if (!o) setPayRow(null); }}
      />
      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.supplier?.name || toDelete?.counterparty_name || "Fornecedor"} ·{" "}
              {fmt(Number(toDelete?.total_brl ?? toDelete?.amount_out ?? 0))}
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

      <CashSettingsDialog
        open={cashOpen}
        onOpenChange={setCashOpen}
        available={cash.available}
        minBalance={cash.minBalance}
        onSave={cash.save}
      />

      <PayableDetailSheet
        row={detailRow}
        available={cash.available}
        coverage={detailRow ? coverage.get(detailRow.id) : undefined}
        onOpenChange={(o: boolean) => { if (!o) setDetailRow(null); }}
      />
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

const HEALTH_META: Record<"saudavel" | "atencao" | "insuficiente", { label: string; badge: string; tone: Tone; icon: React.ReactNode }> = {
  saudavel:     { label: "Saudável",      badge: "bg-success/15 text-success border-success/30",            tone: "success", icon: <ShieldCheck className="h-4 w-4" /> },
  atencao:      { label: "Atenção",       badge: "bg-warning/15 text-warning border-warning/30",            tone: "warning", icon: <AlertTriangle className="h-4 w-4" /> },
  insuficiente: { label: "Insuficiente",  badge: "bg-destructive/15 text-destructive border-destructive/30", tone: "danger",  icon: <TrendingDown className="h-4 w-4" /> },
};

function CashHealthCard({
  configured, health, available, minBalance, previstoTotal, saldoProjetado, deficit, onConfigure,
}: {
  configured: boolean;
  health: "saudavel" | "atencao" | "insuficiente";
  available: number; minBalance: number; previstoTotal: number; saldoProjetado: number; deficit: number;
  onConfigure: () => void;
}) {
  const meta = HEALTH_META[health];
  const minPct = minBalance > 0 ? Math.min(100, Math.max(0, (available / minBalance) * 100)) : 0;
  const showLowAlert = configured && available < previstoTotal;
  const showMinAlert = configured && minBalance > 0 && available < minBalance;

  return (
    <Card className="relative overflow-hidden">
      <span className={`absolute left-0 top-0 h-full w-1 ${toneStyles[meta.tone].bar}`} aria-hidden />
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-md ${toneStyles[meta.tone].icon}`}>{meta.icon}</span>
              <h3 className="font-semibold font-display">Saúde de Caixa</h3>
              <Badge variant="outline" className={meta.badge}>{meta.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Compara o saldo disponível com seus pagamentos previstos.
            </p>
          </div>
          {!configured && (
            <Button size="sm" variant="outline" onClick={onConfigure}>
              <Settings2 className="h-4 w-4 mr-2" /> Configurar caixa
            </Button>
          )}
        </div>

        {!configured ? (
          <p className="text-sm text-muted-foreground">
            Defina seu saldo disponível e o limite mínimo de caixa para ativar o monitoramento.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 items-center">
              <Metric label="Saldo disponível" value={fmt(available)} />
              <Metric label="Pagamentos previstos" value={`− ${fmt(previstoTotal)}`} tone="warning" />
              <Metric label="Saldo projetado" value={fmt(saldoProjetado)} tone={saldoProjetado < 0 ? "danger" : "success"} bold />
            </div>

            {minBalance > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Limite mínimo: {fmt(minBalance)}</span>
                  <span className={`tabular-nums ${available < minBalance ? "text-destructive" : "text-success"}`}>
                    {fmt(available)} ({minPct.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={minPct} />
              </div>
            )}

            {showLowAlert && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Saldo insuficiente</AlertTitle>
                <AlertDescription>
                  Faltam <strong className="tabular-nums">{fmt(deficit)}</strong> para cobrir todos os pagamentos previstos.
                </AlertDescription>
              </Alert>
            )}
            {!showLowAlert && showMinAlert && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Saldo abaixo do limite mínimo</AlertTitle>
                <AlertDescription>
                  Reforce seu caixa para manter a reserva de segurança.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, tone, bold }: { label: string; value: string; tone?: "success" | "danger" | "warning"; bold?: boolean }) {
  const color = tone === "danger" ? "text-destructive" : tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`tabular-nums leading-tight ${bold ? "text-2xl font-bold font-display" : "text-lg font-semibold"} ${color}`}>{value}</p>
    </div>
  );
}

function CashSettingsDialog({
  open, onOpenChange, available, minBalance, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  available: number; minBalance: number;
  onSave: (a: number, m: number) => void;
}) {
  const [a, setA] = useState(String(available || ""));
  const [m, setM] = useState(String(minBalance || ""));
  useEffect(() => { if (open) { setA(String(available || "")); setM(String(minBalance || "")); } }, [open, available, minBalance]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar caixa</DialogTitle>
          <DialogDescription>
            Informe o saldo disponível atual e o limite mínimo de segurança. Os valores são salvos neste navegador.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cap-avail">Saldo disponível (BRL)</Label>
            <Input id="cap-avail" type="number" inputMode="decimal" step="0.01" value={a} onChange={(e) => setA(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cap-min">Limite mínimo (BRL)</Label>
            <Input id="cap-min" type="number" inputMode="decimal" step="0.01" value={m} onChange={(e) => setM(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onSave(Number(a) || 0, Number(m) || 0); onOpenChange(false); toast.success("Configuração de caixa salva"); }}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayableDetailSheet({
  row, available, coverage: cov, onOpenChange,
}: {
  row: Row | null;
  available: number;
  coverage: Coverage | undefined;
  onOpenChange: (o: boolean) => void;
}) {
  if (!row) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent />
      </Sheet>
    );
  }
  const fornecedor = row.supplier?.name || row.counterparty_name || "—";
  const open = Number(row.open_amount ?? 0);
  const proj = available - open;
  const isDeficit = proj < 0;

  return (
    <Sheet open={!!row} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{fornecedor}</SheetTitle>
          <SheetDescription>{row.movement_description ?? "—"}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <DetailRow label="Vencimento" value={fmtDateBR(row.due_date)} />
          <DetailRow label="Valor da despesa" value={fmt(open)} strong />
          <DetailRow label="Saldo disponível" value={fmt(available)} />
          <DetailRow
            label="Saldo projetado após pagamento"
            value={fmt(proj)}
            tone={isDeficit ? "danger" : "success"}
            strong
          />
          <DetailRow
            label={isDeficit ? "Déficit" : "Sobra"}
            value={fmt(Math.abs(proj))}
            tone={isDeficit ? "danger" : "success"}
          />
          {cov && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Impacto no caixa</span>
              <Badge variant="outline" className={COVERAGE_BADGE[cov]}>{COVERAGE_LABEL[cov]}</Badge>
            </div>
          )}
          {cov === "sem" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sem cobertura</AlertTitle>
              <AlertDescription>
                Este pagamento ultrapassa o saldo disponível considerando as obrigações anteriores.
              </AlertDescription>
            </Alert>
          )}
          {cov === "apertado" && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cobertura apertada</AlertTitle>
              <AlertDescription>
                O caixa cobre parcialmente este pagamento dentro da ordem de vencimento.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value, tone, strong }: { label: string; value: string; tone?: "success" | "danger"; strong?: boolean }) {
  const color = tone === "danger" ? "text-destructive" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${strong ? "font-bold text-lg" : "font-medium"} ${color}`}>{value}</span>
    </div>
  );
}
