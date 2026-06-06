import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  FileText,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Clock,
  AlertOctagon,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useFinanceiroCatalogs } from "@/hooks/useFinanceiroCatalogs";

export const Route = createFileRoute("/_authenticated/financeiro/rapport")({
  component: RapportPage,
});

// ---------- helpers ----------
const BRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}
function addMonths(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}
function monthRange(key: string) {
  const [y, m] = key.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

type EntryRow = {
  id: string;
  entry_type: "receita" | "despesa" | string;
  total_brl: number | null;
  paid_amount: number | null;
  open_amount: number | null;
  due_date: string | null;
  paid_at: string | null;
  payment_status: string | null;
  conciliation_status: string | null;
  client_id: string | null;
  category_id: string | null;
  movement_description: string | null;
  category?: { name: string | null } | null;
};

// ---------- page ----------
function RapportPage() {
  const navigate = useNavigate();
  const cats = useFinanceiroCatalogs();
  const clients = cats.clients ?? [];

  const now = new Date();
  const [clientId, setClientId] = useState<string>("all");
  const [month, setMonth] = useState<string>(monthKey(now));
  const [generatedAt, setGeneratedAt] = useState<number>(Date.now());

  const months3 = useMemo(() => [addMonths(month, -2), addMonths(month, -1), month], [month]);

  const q = useQuery({
    queryKey: ["rapport", clientId, months3, generatedAt],
    queryFn: async () => {
      let qb = supabase
        .from("financial_entries")
        .select(
          "id, entry_type, total_brl, paid_amount, open_amount, due_date, paid_at, payment_status, conciliation_status, client_id, category_id, competence_month, movement_description, category:financial_categories(name)"
        )
        .in("competence_month", months3)
        .limit(5000);
      if (clientId !== "all") qb = qb.eq("client_id", clientId);
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as unknown as EntryRow[];
    },
  });

  const rows = q.data ?? [];
  const isEmpty = !q.isLoading && rows.length === 0;

  // Aggregations por competência
  const byMonth = useMemo(() => {
    const map = new Map<
      string,
      {
        receitasPrev: number;
        despesasPrev: number;
        recebido: number;
        pago: number;
        abertoIn: number;
        abertoOut: number;
      }
    >();
    for (const k of months3)
      map.set(k, {
        receitasPrev: 0,
        despesasPrev: 0,
        recebido: 0,
        pago: 0,
        abertoIn: 0,
        abertoOut: 0,
      });
    for (const r of rows) {
      const k = (r as any).competence_month as string | null;
      if (!k || !map.has(k)) continue;
      if (r.entry_type === "transferencia") continue;
      const bucket = map.get(k)!;
      const total = Number(r.total_brl ?? 0);
      const paid = Number(r.paid_amount ?? 0);
      const open = Number(
        r.open_amount ?? Math.max(total - paid, 0)
      );
      if (r.entry_type === "receita") {
        bucket.receitasPrev += total;
        bucket.recebido += paid;
        bucket.abertoIn += open;
      } else if (r.entry_type === "despesa") {
        bucket.despesasPrev += total;
        bucket.pago += paid;
        bucket.abertoOut += open;
      }
    }
    return map;
  }, [rows, months3]);

  const current = byMonth.get(month)!;
  const previous = byMonth.get(addMonths(month, -1))!;

  const resultado = current.recebido - current.pago;
  const resultadoPrevisto = current.receitasPrev - current.despesasPrev;
  const saldoInicial = 0; // sem extrato bancário ainda; mantido como referência visual
  const saldoFinal = saldoInicial + resultado;

  // Vencidos e pendências (no escopo retornado)
  const todayStr = new Date().toISOString().slice(0, 10);
  const vencidos = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.payment_status !== "pago" &&
          r.due_date &&
          r.due_date < todayStr &&
          Number(r.open_amount ?? 0) > 0
      ),
    [rows, todayStr]
  );
  const vencidosTotalIn = vencidos
    .filter((r) => r.entry_type === "receita")
    .reduce((s, r) => s + Number(r.open_amount ?? 0), 0);
  const vencidosTotalOut = vencidos
    .filter((r) => r.entry_type === "despesa")
    .reduce((s, r) => s + Number(r.open_amount ?? 0), 0);

  const pendentesConciliacao = rows.filter(
    (r) => (r.conciliation_status ?? "pendente") === "pendente"
  ).length;

  const monthlySeries = months3.map((k) => {
    const v = byMonth.get(k)!;
    return {
      month: monthLabel(k),
      receitas: Math.round(v.recebido),
      despesas: Math.round(v.pago),
      resultado: Math.round(v.recebido - v.pago),
    };
  });

  // Top despesas por categoria (mês atual) — usa valor pago, fallback para total
  const topDespesas = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.entry_type !== "despesa") continue;
      if ((r as any).competence_month !== month) continue;
      const name = r.category?.name ?? "Sem categoria";
      const v = Number(r.paid_amount ?? r.total_brl ?? 0);
      if (v <= 0) continue;
      map.set(name, (map.get(name) ?? 0) + v);
    }
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));
    arr.sort((a, b) => b.value - a.value);
    return arr.slice(0, 6);
  }, [rows, month]);

  // Itens de atenção
  const atencao = useMemo(() => {
    const items: { icon: any; title: string; description: string; tone: "warn" | "danger" | "info" }[] = [];

    // Despesas que aumentaram (compara pagos do mês vs. mês anterior)
    if (previous.pago > 0) {
      const delta = current.pago - previous.pago;
      const pct = (delta / previous.pago) * 100;
      if (pct >= 10) {
        items.push({
          icon: TrendingUp,
          title: "Despesas em alta",
          description: `Pagamentos cresceram ${pct.toFixed(1)}% vs. mês anterior (${BRL(delta)} a mais).`,
          tone: "warn",
        });
      }
    }

    // Contas vencidas
    if (vencidos.length > 0) {
      const total = vencidosTotalIn + vencidosTotalOut;
      items.push({
        icon: AlertOctagon,
        title: `${vencidos.length} contas vencidas`,
        description: `Total em atraso: ${BRL(total)} (a receber ${BRL(vencidosTotalIn)} · a pagar ${BRL(vencidosTotalOut)}).`,
        tone: "danger",
      });
    }

    // Saldo negativo
    if (saldoFinal < 0) {
      items.push({
        icon: AlertTriangle,
        title: "Resultado negativo no mês",
        description: `O mês fecha com ${BRL(saldoFinal)} de resultado. Avalie aporte ou postergação de despesas.`,
        tone: "danger",
      });
    }

    // Pendências de conciliação
    if (pendentesConciliacao > 0) {
      items.push({
        icon: RefreshCcw,
        title: `${pendentesConciliacao} lançamentos sem conciliação`,
        description: "Existem lançamentos com conciliação pendente no período.",
        tone: "info",
      });
    }

    if (items.length === 0) {
      items.push({
        icon: Sparkles,
        title: "Nenhum ponto crítico no período",
        description: "O mês está saudável: sem atrasos relevantes, alta de despesas ou resultado negativo.",
        tone: "info",
      });
    }
    return items;
  }, [current, previous, saldoFinal, vencidos, vencidosTotalIn, vencidosTotalOut, pendentesConciliacao]);

  // Resumo executivo (gerado a partir dos números)
  const resumoExecutivo = useMemo(() => {
    const clienteNome =
      clientId === "all" ? "a operação" : clients.find((c) => c.id === clientId)?.name ?? "o cliente";
    const tendencia =
      resultado > 0
        ? `resultado positivo de ${BRL(resultado)}`
        : resultado < 0
        ? `resultado negativo de ${BRL(Math.abs(resultado))}`
        : `resultado equilibrado`;
    const variacao =
      previous.pago > 0
        ? `Os pagamentos variaram ${(((current.pago - previous.pago) / previous.pago) * 100).toFixed(1)}% em relação ao mês anterior.`
        : `Não há base do mês anterior para comparação de despesas.`;
    return `No período de ${monthLabel(month)}, ${clienteNome} apresentou ${tendencia}. Recebemos ${BRL(
      current.recebido
    )} e pagamos ${BRL(current.pago)}. ${variacao} Ainda há ${BRL(current.abertoIn)} a receber e ${BRL(
      current.abertoOut
    )} a pagar em aberto.`;
  }, [clientId, clients, month, current, previous, resultado]);

  function handleGenerate() {
    setGeneratedAt(Date.now());
    toast.success("Rapport atualizado", { description: `Período: ${monthLabel(month)}` });
  }

  function handleCopyResumo() {
    navigator.clipboard.writeText(resumoExecutivo).then(
      () => toast.success("Resumo copiado para a área de transferência"),
      () => toast.error("Não foi possível copiar")
    );
  }

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2, 220 70% 50%))",
    "hsl(var(--chart-3, 160 60% 45%))",
    "hsl(var(--chart-4, 30 80% 55%))",
    "hsl(var(--chart-5, 280 65% 60%))",
    "hsl(var(--muted-foreground))",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/financeiro" })}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">Rapport</h1>
            <p className="text-sm text-muted-foreground">
              Relatório mensal simples, visual e pronto para o cliente
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info("Exportar PDF — em breve")}>
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("Enviar ao cliente — em breve")}>
            <Send className="h-4 w-4" />
            Enviar ao cliente
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCopyResumo}>
            <Copy className="h-4 w-4" />
            Copiar resumo
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_180px_auto] items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mês de competência</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value || monthKey(new Date()))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Período de análise</Label>
              <div className="h-9 px-3 rounded-md border bg-muted/30 text-sm flex items-center text-muted-foreground">
                {monthLabel(months3[0])} → {monthLabel(months3[2])}
              </div>
            </div>
            <Button onClick={handleGenerate}>
              <Sparkles className="h-4 w-4" />
              Gerar Rapport
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Saldo inicial" value={BRL(saldoInicial)} icon={Wallet} tone="muted" hint="estimado" />
        <KpiCard
          label="Entradas do mês"
          value={BRL(current.receitas)}
          icon={ArrowUpRight}
          tone="success"
        />
        <KpiCard
          label="Saídas do mês"
          value={BRL(current.despesas)}
          icon={ArrowDownRight}
          tone="danger"
        />
        <KpiCard
          label="Resultado do mês"
          value={BRL(resultado)}
          icon={resultado >= 0 ? TrendingUp : TrendingDown}
          tone={resultado >= 0 ? "success" : "danger"}
        />
        <KpiCard
          label="Saldo final"
          value={BRL(saldoFinal)}
          icon={Wallet}
          tone={saldoFinal >= 0 ? "primary" : "danger"}
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução dos últimos 3 meses</CardTitle>
            <CardDescription>Receitas, despesas e resultado por mês</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="receitas" stroke="hsl(142 70% 45%)" strokeWidth={2} dot />
                <Line type="monotone" dataKey="despesas" stroke="hsl(0 75% 55%)" strokeWidth={2} dot />
                <Line type="monotone" dataKey="resultado" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas x Despesas</CardTitle>
            <CardDescription>Comparativo mensal</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Legend />
                <Bar dataKey="receitas" fill="hsl(142 70% 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="hsl(0 75% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Principais despesas por categoria</CardTitle>
          <CardDescription>Top 6 categorias no mês selecionado</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          {topDespesas.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem despesas categorizadas neste mês.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDespesas} layout="vertical" margin={{ top: 8, right: 24, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {topDespesas.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Resumo executivo + Itens de atenção */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Resumo executivo
                </CardTitle>
                <CardDescription>Linguagem simples, pronta para o cliente</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px]">gerado automaticamente</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">{resumoExecutivo}</p>
            <Separator className="my-4" />
            <Button variant="outline" size="sm" onClick={handleCopyResumo}>
              <Copy className="h-4 w-4" />
              Copiar resumo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Itens de atenção
            </CardTitle>
            <CardDescription>Pontos que merecem revisão neste período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {atencao.map((item, idx) => {
              const Icon = item.icon;
              const toneClasses =
                item.tone === "danger"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : item.tone === "warn"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-primary/10 text-primary border-primary/20";
              return (
                <div key={idx} className={`flex gap-3 rounded-lg border p-3 ${toneClasses}`}>
                  <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <Clock className="h-3.5 w-3.5" />
              Análise baseada nos lançamentos do período selecionado.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------- KPI ----------
function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "muted",
  hint,
}: {
  label: string;
  value: string;
  icon: any;
  tone?: "primary" | "success" | "danger" | "muted";
  hint?: string;
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600"
      : tone === "danger"
      ? "bg-destructive/10 text-destructive"
      : tone === "primary"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold tracking-tight">{value}</p>
            {hint ? <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{hint}</p> : null}
          </div>
          <div className={`h-9 w-9 rounded-md flex items-center justify-center ${toneClasses}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
