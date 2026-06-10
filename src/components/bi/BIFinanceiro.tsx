import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarRange,
  Eraser,
  Filter,
  PieChart as PieIcon,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { ActiveCompanyBanner } from "@/components/ActiveCompanyBanner";
import { useFinanceiroCatalogs } from "@/hooks/useFinanceiroCatalogs";
import { findArea, getAreasFor } from "@/lib/businessAreas";
import { isCompanyCode, type CompanyCode } from "@/lib/companyCodes";

// ------------ helpers ------------
const BRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const PCT = (n: number) => `${(n * 100).toFixed(1)}%`;
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

const CHART_COLORS = [
  "#10B981", // Emerald
  "#0EA5E9", // Sky
  "#8B5CF6", // Violet
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#14B8A6", // Teal
];

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111827]/90 backdrop-blur-xl border border-white/10 p-4 shadow-2xl rounded-xl">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-10">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: entry.color, color: entry.color }} />
                <span className="text-xs font-bold text-white/70">{entry.name}</span>
              </div>
              <span className="text-xs font-black text-white">
                {formatter ? formatter(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};


type Row = {
  id: string;
  entry_type: string | null;
  total_brl: number | null;
  paid_amount: number | null;
  open_amount: number | null;
  amount_in: number | null;
  amount_out: number | null;
  due_date: string | null;
  paid_at: string | null;
  entry_date: string;
  competence_month: string | null;
  payment_status: string | null;
  conciliation_status: string | null;
  client_id: string | null;
  supplier_id: string | null;
  category_id: string | null;
  bank_account_id: string | null;
  business_unit: string | null;
  responsible_sector: string | null;
  movement_description: string | null;
  counterparty_name: string | null;
};

type Filters = {
  from: string;
  to: string;
  competence: string;
  clientId: string;
  supplierId: string;
  bu: string;
  area: string;
  bankId: string;
  paymentStatus: string;
  categoryId: string;
  origin: string;
};

const today0 = new Date();
const firstOfMonth = new Date(today0.getFullYear(), today0.getMonth() - 5, 1)
  .toISOString()
  .slice(0, 10);

const defaultFilters: Filters = {
  from: firstOfMonth,
  to: today(),
  competence: "all",
  clientId: "all",
  supplierId: "all",
  bu: "all",
  area: "all",
  bankId: "all",
  paymentStatus: "all",
  categoryId: "all",
  origin: "all",
};

export default function BIFinanceiro() {
  const cats = useFinanceiroCatalogs();
  const { filterCode: companyCode } = useCompany();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [tabFocus, setTabFocus] = useState<string | null>(null);

  const banks = useQuery({
    queryKey: ["bi", "banks"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, bank_name, account_number")
        .order("bank_name");
      if (error) throw error;
      return (data ?? []).map((b: any) => ({
        id: b.id as string,
        name: `${b.bank_name}${b.account_number ? ` · ${b.account_number}` : ""}`,
      }));
    },
  });

  const businessUnits = useQuery({
    queryKey: ["bi", "bus"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_units")
        .select("code, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as { code: string; name: string }[];
    },
  });

  const q = useQuery({
    queryKey: ["bi-fin", filters, companyCode],
    queryFn: async () => {
      let qb = supabase
        .from("financial_entries")
        .select(
          "id, entry_type, total_brl, paid_amount, open_amount, amount_in, amount_out, due_date, paid_at, entry_date, competence_month, payment_status, conciliation_status, client_id, supplier_id, category_id, bank_account_id, business_unit, responsible_sector, movement_description, counterparty_name, source_type, document_reference"
        )
        .gte("entry_date", filters.from)
        .lte("entry_date", filters.to)
        .limit(10000);
      if (filters.competence !== "all") qb = qb.eq("competence_month", filters.competence);
      if (filters.clientId !== "all") qb = qb.eq("client_id", filters.clientId);
      if (filters.supplierId !== "all") qb = qb.eq("supplier_id", filters.supplierId);
      const effectiveBu = companyCode ?? (filters.bu !== "all" ? filters.bu : null);
      if (effectiveBu) qb = qb.eq("business_unit", effectiveBu);
      if (filters.area !== "all") qb = qb.eq("responsible_sector", filters.area);
      if (filters.bankId !== "all") qb = qb.eq("bank_account_id", filters.bankId);
      if (filters.paymentStatus !== "all") qb = qb.eq("payment_status", filters.paymentStatus);
      if (filters.categoryId !== "all") qb = qb.eq("category_id", filters.categoryId);
      if (filters.origin === "transferencia") qb = qb.eq("entry_type", "transferencia");
      else if (filters.origin === "ofx") qb = qb.in("source_type", ["importacao_extrato", "importacao_planilha"]);
      else if (filters.origin === "manual")
        qb = qb.eq("source_type", "manual").is("document_reference", null);
      else if (filters.origin === "comercial")
        qb = qb.not("document_reference", "is", null).neq("entry_type", "transferencia");
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows =
    filters.origin === "transferencia"
      ? q.data ?? []
      : (q.data ?? []).filter((r) => r.entry_type !== "transferencia");
  const isLoading = q.isLoading;

  // --------- Aggregations ---------
  const clientName = (id: string | null) => cats.clients.find((c) => c.id === id)?.name ?? "—";
  const supplierName = (id: string | null) => cats.suppliers.find((s) => s.id === id)?.name ?? "—";
  const categoryName = (id: string | null) => cats.categories.find((c) => c.id === id)?.name ?? "Sem categoria";

  const agg = useMemo(() => {
    let receitasPrev = 0,
      receitasReal = 0,
      despesasPrev = 0,
      despesasReal = 0,
      abertoIn = 0,
      abertoOut = 0,
      vencidosIn = 0,
      vencidosOut = 0,
      countVencidos = 0,
      countConciliacao = 0;
    const tdy = today();
    for (const r of rows) {
      const total = Number(r.total_brl ?? (r.entry_type === "receita" ? r.amount_in : r.amount_out) ?? 0);
      const paid = Number(r.paid_amount ?? 0);
      const open = Number(r.open_amount ?? Math.max(total - paid, 0));
      if (r.entry_type === "receita") {
        receitasPrev += total;
        receitasReal += paid;
        abertoIn += open;
        if (open > 0 && r.due_date && r.due_date < tdy) {
          vencidosIn += open;
          countVencidos++;
        }
      } else if (r.entry_type === "despesa") {
        despesasPrev += total;
        despesasReal += paid;
        abertoOut += open;
        if (open > 0 && r.due_date && r.due_date < tdy) {
          vencidosOut += open;
          countVencidos++;
        }
      }
      if (r.conciliation_status === "pendente" || r.conciliation_status === "divergente")
        countConciliacao++;
    }
    const resultado = receitasReal - despesasReal;
    const taxaReceb = receitasPrev > 0 ? receitasReal / receitasPrev : 0;
    const taxaPag = despesasPrev > 0 ? despesasReal / despesasPrev : 0;
    const recebimentos = rows.filter((r) => r.entry_type === "receita" && (r.paid_amount ?? 0) > 0);
    const ticketMedio =
      recebimentos.length > 0
        ? recebimentos.reduce((a, b) => a + Number(b.paid_amount ?? 0), 0) / recebimentos.length
        : 0;
    return {
      receitasPrev,
      receitasReal,
      despesasPrev,
      despesasReal,
      resultado,
      abertoIn,
      abertoOut,
      inadimplencia: vencidosIn,
      countVencidos,
      countConciliacao,
      taxaReceb,
      taxaPag,
      ticketMedio,
    };
  }, [rows]);

  // monthly series
  const monthly = useMemo(() => {
    const map = new Map<string, { k: string; receita: number; despesa: number; recPrev: number; desPrev: number }>();
    for (const r of rows) {
      const k = r.competence_month || (r.entry_date || "").slice(0, 7);
      if (!k) continue;
      if (!map.has(k)) map.set(k, { k, receita: 0, despesa: 0, recPrev: 0, desPrev: 0 });
      const b = map.get(k)!;
      const total = Number(r.total_brl ?? (r.entry_type === "receita" ? r.amount_in : r.amount_out) ?? 0);
      const paid = Number(r.paid_amount ?? 0);
      if (r.entry_type === "receita") {
        b.receita += paid;
        b.recPrev += total;
      } else if (r.entry_type === "despesa") {
        b.despesa += paid;
        b.desPrev += total;
      }
    }
    return Array.from(map.values())
      .sort((a, b) => a.k.localeCompare(b.k))
      .map((b) => ({
        month: monthLabel(b.k),
        Receita: b.receita,
        Despesa: b.despesa,
        Resultado: b.receita - b.despesa,
        "Receita Prev": b.recPrev,
        "Despesa Prev": b.desPrev,
      }));
  }, [rows]);

  const cashflow = useMemo(() => {
    let acc = 0;
    return monthly.map((m) => {
      acc += m.Resultado;
      return { month: m.month, Acumulado: acc };
    });
  }, [monthly]);

  const despesaCategorias = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.entry_type !== "despesa") continue;
      const name = categoryName(r.category_id);
      const v = Number(r.total_brl ?? r.amount_out ?? 0);
      m.set(name, (m.get(name) ?? 0) + v);
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows, cats.categories]);

  const receitaEmpresa = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.entry_type !== "receita") continue;
      const name = r.business_unit ?? "Não informada";
      const v = Number(r.paid_amount ?? 0);
      m.set(name, (m.get(name) ?? 0) + v);
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const receitaArea = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.entry_type !== "receita") continue;
      const name = findArea(r.business_unit as CompanyCode, r.responsible_sector)?.label ?? "Não informada";
      const v = Number(r.paid_amount ?? 0);
      m.set(name, (m.get(name) ?? 0) + v);
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const resultadoEmpresa = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const v = Number(r.paid_amount ?? 0) * (r.entry_type === "receita" ? 1 : -1);
      const name = r.business_unit ?? "Não informada";
      m.set(name, (m.get(name) ?? 0) + v);
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const resultadoArea = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const v = Number(r.paid_amount ?? 0) * (r.entry_type === "receita" ? 1 : -1);
      const name = findArea(r.business_unit as CompanyCode, r.responsible_sector)?.label ?? "Não informada";
      m.set(name, (m.get(name) ?? 0) + v);
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const topClientes = useMemo(() => {
    const m = new Map<string, { receita: number; aberto: number; vencido: number }>();
    const tdy = today();
    for (const r of rows) {
      if (r.entry_type !== "receita") continue;
      const id = r.client_id || "—";
      if (!m.has(id)) m.set(id, { receita: 0, aberto: 0, vencido: 0 });
      const b = m.get(id)!;
      const total = Number(r.total_brl ?? r.amount_in ?? 0);
      const paid = Number(r.paid_amount ?? 0);
      const open = Number(r.open_amount ?? Math.max(total - paid, 0));
      b.receita += total;
      b.aberto += open;
      if (open > 0 && r.due_date && r.due_date < tdy) b.vencido += open;
    }
    return Array.from(m.entries()).map(([id, v]) => ({
      name: clientName(id),
      ...v,
      taxaPag: v.receita > 0 ? (v.receita - v.aberto) / v.receita : 0,
    }));
  }, [rows, cats.clients]);

  const top10ClientesReceita = [...topClientes].sort((a, b) => b.receita - a.receita).slice(0, 10);
  const top10Inadimplentes = [...topClientes].filter((c) => c.vencido > 0).sort((a, b) => b.vencido - a.vencido).slice(0, 10);

  const topFornecedores = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.entry_type !== "despesa") continue;
      const id = r.supplier_id || "—";
      m.set(id, (m.get(id) ?? 0) + Number(r.total_brl ?? r.amount_out ?? 0));
    }
    return Array.from(m.entries())
      .map(([id, value]) => ({ name: supplierName(id), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [rows, cats.suppliers]);

  const maiorClienteAberto = [...topClientes].sort((a, b) => b.aberto - a.aberto)[0];
  const maiorFornecedorAberto = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.entry_type !== "despesa") continue;
      const id = r.supplier_id || "—";
      const total = Number(r.total_brl ?? r.amount_out ?? 0);
      const paid = Number(r.paid_amount ?? 0);
      const open = Number(r.open_amount ?? Math.max(total - paid, 0));
      m.set(id, (m.get(id) ?? 0) + open);
    }
    const top = Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: supplierName(top[0]), value: top[1] } : null;
  }, [rows, cats.suppliers]);

  const funil = useMemo(() => {
    let aReceber = 0,
      vencido = 0,
      cobrado = 0,
      recebido = 0;
    const tdy = today();
    for (const r of rows) {
      if (r.entry_type !== "receita") continue;
      const total = Number(r.total_brl ?? r.amount_in ?? 0);
      const paid = Number(r.paid_amount ?? 0);
      const open = Number(r.open_amount ?? Math.max(total - paid, 0));
      aReceber += total;
      if (open > 0 && r.due_date && r.due_date < tdy) vencido += open;
      if (paid > 0) cobrado += total;
      recebido += paid;
    }
    return [
      { stage: "A receber", value: aReceber },
      { stage: "Vencido", value: vencido },
      { stage: "Cobrado", value: cobrado },
      { stage: "Recebido", value: recebido },
    ];
  }, [rows]);

  const conciliacao = useMemo(() => {
    const c = { Conciliado: 0, Pendente: 0, Divergente: 0 };
    for (const r of rows) {
      if (r.conciliation_status === "conciliado") c.Conciliado++;
      else if (r.conciliation_status === "divergente") c.Divergente++;
      else c.Pendente++;
    }
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [rows]);

  // critical tables
  const contasReceberCriticas = useMemo(() => {
    const tdy = today();
    return rows
      .filter((r) => r.entry_type === "receita" && Number(r.open_amount ?? 0) > 0)
      .map((r) => {
        const dias = r.due_date ? daysBetween(r.due_date, tdy) : 0;
        return {
          id: r.id,
          cliente: clientName(r.client_id) || r.counterparty_name || "—",
          vencimento: r.due_date ?? "—",
          valor: Number(r.open_amount ?? 0),
          dias,
          status: r.payment_status ?? (dias > 0 ? "vencido" : "em_aberto"),
          acao: dias > 30 ? "Acionar jurídico" : dias > 7 ? "Enviar cobrança" : "Lembrete amistoso",
        };
      })
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 15);
  }, [rows, cats.clients]);

  const contasPagarCriticas = useMemo(() => {
    const tdy = today();
    return rows
      .filter((r) => r.entry_type === "despesa" && Number(r.open_amount ?? 0) > 0)
      .map((r) => {
        const dias = r.due_date ? daysBetween(r.due_date, tdy) : 0;
        return {
          id: r.id,
          fornecedor: supplierName(r.supplier_id) || r.counterparty_name || "—",
          vencimento: r.due_date ?? "—",
          valor: Number(r.open_amount ?? 0),
          dias,
          status: r.payment_status ?? (dias > 0 ? "vencido" : "em_aberto"),
          prioridade: dias > 15 ? "alta" : dias > 0 ? "média" : "baixa",
        };
      })
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 15);
  }, [rows, cats.suppliers]);

  const pendentesConciliacao = useMemo(
    () =>
      rows
        .filter((r) => r.conciliation_status !== "conciliado")
        .slice(0, 15)
        .map((r) => ({
          id: r.id,
          data: r.entry_date,
          descricao: r.movement_description ?? "—",
          valor: Number(r.total_brl ?? r.amount_in ?? r.amount_out ?? 0),
          conta: banks.data?.find((b) => b.id === r.bank_account_id)?.name ?? "—",
          status: r.conciliation_status ?? "pendente",
          origem: r.entry_type ?? "—",
        })),
    [rows, banks.data]
  );

  // Insights
  const insights = useMemo(() => {
    const list: { titulo: string; descricao: string; severidade: "baixa" | "media" | "alta"; acao: string }[] = [];
    if (monthly.length >= 2) {
      const cur = monthly[monthly.length - 1];
      const prev = monthly[monthly.length - 2];
      if (prev.Receita > 0) {
        const delta = (cur.Receita - prev.Receita) / prev.Receita;
        if (delta < -0.1)
          list.push({
            titulo: "Receita em queda",
            descricao: `Receita caiu ${PCT(Math.abs(delta))} em relação ao mês anterior.`,
            severidade: delta < -0.25 ? "alta" : "media",
            acao: "Revise pipeline comercial e cobrança.",
          });
      }
      if (prev.Despesa > 0) {
        const delta = (cur.Despesa - prev.Despesa) / prev.Despesa;
        if (delta > 0.1)
          list.push({
            titulo: "Despesa em alta",
            descricao: `Despesas subiram ${PCT(delta)} em relação ao mês anterior.`,
            severidade: delta > 0.25 ? "alta" : "media",
            acao: "Auditar maiores categorias de gasto.",
          });
      }
      if (cur.Resultado < 0)
        list.push({
          titulo: "Resultado negativo no mês",
          descricao: `Resultado de ${BRL(cur.Resultado)} em ${cur.month}.`,
          severidade: "alta",
          acao: "Reduzir gastos não essenciais e acelerar cobranças.",
        });
    }
    if (top10Inadimplentes[0] && agg.inadimplencia > 0) {
      const c = top10Inadimplentes[0];
      const pct = c.vencido / agg.inadimplencia;
      if (pct > 0.3)
        list.push({
          titulo: "Concentração de inadimplência",
          descricao: `${c.name} concentra ${PCT(pct)} da inadimplência total.`,
          severidade: "alta",
          acao: "Negociar plano de pagamento.",
        });
    }
    const tdy = new Date(today());
    const in7 = rows.filter(
      (r) =>
        r.entry_type === "receita" &&
        Number(r.open_amount ?? 0) > 0 &&
        r.due_date &&
        new Date(r.due_date) > tdy &&
        daysBetween(today(), r.due_date) <= 7
    ).length;
    if (in7 > 0)
      list.push({
        titulo: "Vencimentos próximos",
        descricao: `${in7} cobranças vencendo nos próximos 7 dias.`,
        severidade: in7 > 10 ? "alta" : "media",
        acao: "Disparar lembretes preventivos.",
      });
    const veryLate = rows.filter(
      (r) =>
        Number(r.open_amount ?? 0) > 0 &&
        r.due_date &&
        daysBetween(r.due_date, today()) > 15
    ).length;
    if (veryLate > 0)
      list.push({
        titulo: "Cobranças muito atrasadas",
        descricao: `${veryLate} contas vencidas há mais de 15 dias.`,
        severidade: "alta",
        acao: "Escalar para cobrança ativa.",
      });
    if (agg.countConciliacao > 20)
      list.push({
        titulo: "Conciliação pendente",
        descricao: `${agg.countConciliacao} lançamentos sem conciliação.`,
        severidade: "media",
        acao: "Priorizar conciliação bancária.",
      });
    const despMaior = despesaCategorias[0];
    if (despMaior)
      list.push({
        titulo: "Maior categoria de despesa",
        descricao: `${despMaior.name} representa ${BRL(despMaior.value)}.`,
        severidade: "baixa",
        acao: "Avaliar oportunidades de redução.",
      });
    // Cliente com maior risco financeiro
    const risco = [...topClientes]
      .map((c) => ({ ...c, risco: c.vencido * 0.7 + c.aberto * 0.3 }))
      .filter((c) => c.risco > 0)
      .sort((a, b) => b.risco - a.risco)[0];
    if (risco)
      list.push({
        titulo: "Cliente com maior risco financeiro",
        descricao: `${risco.name} — ${BRL(risco.vencido)} vencido e ${BRL(risco.aberto)} em aberto.`,
        severidade: risco.vencido > 0 ? "alta" : "media",
        acao: "Revisar limite de crédito e renegociar.",
      });
    return list;
  }, [monthly, top10Inadimplentes, agg, rows, despesaCategorias, topClientes]);

  const clearFilters = () => setFilters(defaultFilters);

  const exportCSV = () => {
    const cols = ["id", "entry_date", "competence_month", "entry_type", "total_brl", "paid_amount", "open_amount", "due_date", "payment_status", "conciliation_status", "movement_description"];
    const lines = [cols.join(",")];
    for (const r of rows) {
      lines.push(cols.map((c) => JSON.stringify((r as any)[c] ?? "")).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bi-financeiro-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- render ----------
  return (
    <div className="space-y-3">
      <ActiveCompanyBanner />
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="py-2 px-4 border-b bg-muted/10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <CardTitle className="text-sm font-bold">Filtros Financeiros</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={exportCSV}>Exportar</Button>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={clearFilters}>
                <Eraser className="h-3.5 w-3.5 mr-1" /> Limpar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-3">

          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Competência</Label>
            <Input
              placeholder="YYYY-MM ou Todas"
              value={filters.competence === "all" ? "" : filters.competence}
              onChange={(e) => setFilters({ ...filters, competence: e.target.value || "all" })}
            />
          </div>
          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={filters.clientId} onValueChange={(v) => setFilters({ ...filters, clientId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {cats.clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Fornecedor</Label>
            <Select value={filters.supplierId} onValueChange={(v) => setFilters({ ...filters, supplierId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {cats.suppliers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Unidade de negócio</Label>
            <Select value={filters.bu} onValueChange={(v) => setFilters({ ...filters, bu: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(businessUnits.data ?? []).map((b) => (
                  <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Área Principal</Label>
            <Select value={filters.area} onValueChange={(v) => setFilters({ ...filters, area: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {getAreasFor(filters.bu === "all" ? null : (filters.bu as CompanyCode)).map((a) => (
                  <SelectItem key={a.slug} value={a.slug}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Banco / Conta</Label>
            <Select value={filters.bankId} onValueChange={(v) => setFilters({ ...filters, bankId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(banks.data ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status de pagamento</Label>
            <Select value={filters.paymentStatus} onValueChange={(v) => setFilters({ ...filters, paymentStatus: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="em_aberto">Em aberto</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={filters.categoryId} onValueChange={(v) => setFilters({ ...filters, categoryId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {cats.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Origem</Label>
            <Select value={filters.origin} onValueChange={(v) => setFilters({ ...filters, origin: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="ofx">OFX/Extrato</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Modernos Financeiros */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

        {[
          { 
            label: "RECEITA REALIZADA", 
            value: BRL(agg.receitasReal), 
            sub: `vs ${BRL(agg.receitasPrev)} previsto`,
            icon: TrendingUp, 
            color: "emerald", 
            trend: agg.taxaReceb > 0.8 ? "pos" : "neutral",
            trendValue: PCT(agg.taxaReceb)
          },
          { 
            label: "DESPESA REALIZADA", 
            value: BRL(agg.despesasReal), 
            sub: `vs ${BRL(agg.despesasPrev)} previsto`,
            icon: TrendingDown, 
            color: "rose",
            trend: "neg",
            trendValue: PCT(agg.taxaPag)
          },
          { 
            label: "RESULTADO LÍQUIDO", 
            value: BRL(agg.resultado), 
            sub: "Saldo consolidado",
            icon: Wallet, 
            color: agg.resultado >= 0 ? "sky" : "red",
            trend: agg.resultado >= 0 ? "pos" : "neg",
            trendValue: ""
          },
          { 
            label: "A RECEBER", 
            value: BRL(agg.abertoIn), 
            sub: "Fluxo pendente",
            icon: Banknote, 
            color: "indigo",
            trend: "neutral",
            trendValue: ""
          },
        ].map((kpi, i) => (
          <Card key={i} className="group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] border border-white/5 bg-[#1a2233]/40 backdrop-blur-xl shadow-2xl">
            {/* Ambient Glow */}
            <div className={cn(
              "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-all duration-700",
              kpi.color === "emerald" ? "bg-emerald-500" : 
              kpi.color === "rose" ? "bg-rose-500" : 
              kpi.color === "sky" ? "bg-sky-500" : 
              kpi.color === "indigo" ? "bg-indigo-500" : "bg-white"
            )} />

            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors uppercase">
                    {kpi.label}
                  </span>
                  <div className={cn(
                    "p-2 rounded-lg bg-white/5 border border-white/5 text-white/50 group-hover:text-white transition-all duration-500",
                    kpi.color === "emerald" ? "group-hover:bg-emerald-500/20 group-hover:border-emerald-500/20 group-hover:text-emerald-400" :
                    kpi.color === "rose" ? "group-hover:bg-rose-500/20 group-hover:border-rose-500/20 group-hover:text-rose-400" :
                    kpi.color === "sky" ? "group-hover:bg-sky-500/20 group-hover:border-sky-500/20 group-hover:text-sky-400" :
                    kpi.color === "indigo" ? "group-hover:bg-indigo-500/20 group-hover:border-indigo-500/20 group-hover:text-indigo-400" : ""
                  )}>
                    <kpi.icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-3xl font-black tracking-tighter text-white">
                    {kpi.value}
                  </h2>
                  <div className="flex items-center gap-2">
                    {kpi.trend !== "neutral" && (
                      <div className={cn(
                        "flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-md",
                        kpi.trend === "pos" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      )}>
                        {kpi.trend === "pos" ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                        {kpi.trendValue}
                      </div>
                    )}
                    <span className="text-[11px] font-bold text-white/30 uppercase tracking-tight">
                      {kpi.sub}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>


      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { 
            label: "INADIMPLÊNCIA", 
            value: BRL(agg.inadimplencia), 
            sub: `${agg.countVencidos} contas em atraso`,
            icon: AlertOctagon, 
            color: "red",
            trend: agg.inadimplencia > 0 ? "neg" : "neutral",
            trendValue: ""
          },
          { 
            label: "CONCILIAÇÃO", 
            value: agg.countConciliacao, 
            sub: "Pendências no extrato",
            icon: Activity, 
            color: "orange",
            trend: "neutral",
            trendValue: ""
          },
          { 
            label: "TICKET MÉDIO", 
            value: BRL(agg.ticketMedio), 
            sub: "Valor por recebimento",
            icon: Target, 
            color: "cyan",
            trend: "neutral",
            trendValue: ""
          },
          { 
            label: "EFICIÊNCIA", 
            value: PCT(agg.taxaReceb), 
            sub: `${PCT(agg.taxaPag)} de pagamentos`,
            icon: Sparkles, 
            color: "violet",
            trend: "pos",
            trendValue: ""
          },
        ].map((kpi, i) => (
          <Card key={i} className="group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] border border-white/5 bg-[#1a2233]/40 backdrop-blur-xl shadow-2xl">
            <div className={cn(
              "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-all duration-700",
              kpi.color === "red" ? "bg-red-500" : 
              kpi.color === "orange" ? "bg-orange-500" : 
              kpi.color === "cyan" ? "bg-cyan-500" : 
              kpi.color === "violet" ? "bg-violet-500" : "bg-white"
            )} />

            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors uppercase">
                    {kpi.label}
                  </span>
                  <div className={cn(
                    "p-2 rounded-lg bg-white/5 border border-white/5 text-white/50 group-hover:text-white transition-all duration-500",
                    kpi.color === "red" ? "group-hover:bg-red-500/20 group-hover:border-red-500/20 group-hover:text-red-400" :
                    kpi.color === "orange" ? "group-hover:bg-orange-500/20 group-hover:border-orange-500/20 group-hover:text-orange-400" :
                    kpi.color === "cyan" ? "group-hover:bg-cyan-500/20 group-hover:border-cyan-500/20 group-hover:text-cyan-400" :
                    kpi.color === "violet" ? "group-hover:bg-violet-500/20 group-hover:border-violet-500/20 group-hover:text-violet-400" : ""
                  )}>
                    <kpi.icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-3xl font-black tracking-tighter text-white">
                    {kpi.value}
                  </h2>
                  <p className="text-[11px] font-bold text-white/30 uppercase tracking-tight">
                    {kpi.sub}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

            kpi.border
          )}>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className={cn(
              "absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-30 opacity-20",
              `bg-${kpi.color}-500`
            )} />

            <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                {kpi.label}
              </CardTitle>
              <div className={cn(
                "p-2.5 rounded-xl backdrop-blur-xl border transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 shadow-lg",
                `bg-${kpi.color}-500/10 border-${kpi.color}-500/20 text-${kpi.color}-500`
              )}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-4">
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-black tracking-tighter transition-all duration-500 group-hover:scale-[1.02] origin-left">
                  {kpi.value}
                </span>
                <div className="flex items-center mt-2 px-2 py-1 rounded-full bg-black/5 dark:bg-white/5 w-fit border border-white/5">
                  {kpi.trend === "neg" && <ArrowDownRight className="h-3 w-3 text-rose-500 mr-1 animate-bounce" />}
                  <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground whitespace-nowrap">
                    {kpi.sub}
                  </span>
                </div>
              </div>
            </CardContent>
            <div className={cn(
              "absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-current transition-all duration-700 opacity-50",
              `text-${kpi.color}-500`
            )} />
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">

        <Card className="border-0 shadow-sm overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="relative z-10 border-b bg-muted/20">
            <CardTitle className="text-lg font-bold">Resumo Financeiro Estratégico</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 p-6">
            <div className="grid gap-8">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground border-b pb-1">Receita e Resultado por Empresa</h4>
                <div className="grid gap-2">
                  {receitaEmpresa.slice(0, 5).map((s) => {
                    const res = resultadoEmpresa.find(r => r.name === s.name)?.value ?? 0;
                    return (
                      <div key={s.name} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-semibold">{s.name}</span>
                          <span className={`text-[10px] font-medium ${res >= 0 ? "text-emerald-600" : "text-rose-600"}`}>Resultado: {BRL(res)}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{BRL(s.value)}</div>
                          <div className="text-[10px] text-muted-foreground">Part.: {PCT(agg.receitasReal > 0 ? s.value / agg.receitasReal : 0)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground border-b pb-1">Receita e Resultado por Área</h4>
                <div className="grid gap-2">
                  {receitaArea.slice(0, 5).map((s) => {
                    const res = resultadoArea.find(r => r.name === s.name)?.value ?? 0;
                    return (
                      <div key={s.name} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-semibold">{s.name}</span>
                          <span className={`text-[10px] font-medium ${res >= 0 ? "text-emerald-600" : "text-rose-600"}`}>Resultado: {BRL(res)}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{BRL(s.value)}</div>
                          <div className="text-[10px] text-muted-foreground">Part.: {PCT(agg.receitasReal > 0 ? s.value / agg.receitasReal : 0)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Participação das Empresas (Faturamento)">
          {isLoading ? <Skeleton className="h-[280px]" /> : receitaEmpresa.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={receitaEmpresa} 
                  dataKey="value" 
                  nameKey="name" 
                  innerRadius={60} 
                  outerRadius={100} 
                  paddingAngle={5}
                  stroke="none"
                >
                  {receitaEmpresa.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} className="hover:opacity-80 transition-opacity" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={BRL} />} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Participação das Áreas (Faturamento)">
          {isLoading ? <Skeleton className="h-[280px]" /> : receitaArea.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={receitaArea} 
                  dataKey="value" 
                  nameKey="name" 
                  innerRadius={60} 
                  outerRadius={100} 
                  paddingAngle={5}
                  stroke="none"
                >
                  {receitaArea.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} className="hover:opacity-80 transition-opacity" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={BRL} />} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Resultado por Empresa">
          {isLoading ? <Skeleton className="h-[280px]" /> : resultadoEmpresa.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={resultadoEmpresa} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => BRL(v).split(',')[0]} />
                <Tooltip content={<CustomTooltip formatter={BRL} />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {resultadoEmpresa.map((entry, i) => (
                    <Cell key={i} fill={entry.value >= 0 ? "#10B981" : "#EF4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Resultado por Área">
          {isLoading ? <Skeleton className="h-[260px]" /> : resultadoArea.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={resultadoArea}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Bar dataKey="value">
                  {resultadoArea.map((entry, i) => (
                    <Cell key={i} fill={entry.value >= 0 ? CHART_COLORS[2] : CHART_COLORS[4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Evolução: Receita, Despesa, Resultado">
          {isLoading ? <Skeleton className="h-[280px]" /> : monthly.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => BRL(v).split(',')[0]} />
                <Tooltip content={<CustomTooltip formatter={BRL} />} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="Receita" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Despesa" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Resultado" stroke="#0EA5E9" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Previsto x Realizado">
          {isLoading ? <Skeleton className="h-[260px]" /> : monthly.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Legend />
                <Bar dataKey="Receita Prev" fill={CHART_COLORS[1]} />
                <Bar dataKey="Receita" fill={CHART_COLORS[2]} />
                <Bar dataKey="Despesa Prev" fill={CHART_COLORS[3]} />
                <Bar dataKey="Despesa" fill={CHART_COLORS[4]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Despesas por categoria">
          {isLoading ? <Skeleton className="h-[260px]" /> : despesaCategorias.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={despesaCategorias} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} onClick={(d: any) => setTabFocus(`categoria:${d.name}`)}>
                  {despesaCategorias.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Fluxo de caixa acumulado">
          {isLoading ? <Skeleton className="h-[260px]" /> : cashflow.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={cashflow}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Area type="monotone" dataKey="Acumulado" fill={CHART_COLORS[0]} stroke={CHART_COLORS[0]} fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top 10 clientes por receita">
          {isLoading ? <Skeleton className="h-[260px]" /> : top10ClientesReceita.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top10ClientesReceita} layout="vertical" onClick={() => setTabFocus("receber")}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Bar dataKey="receita" fill={CHART_COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top 10 clientes inadimplentes">
          {isLoading ? <Skeleton className="h-[260px]" /> : top10Inadimplentes.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top10Inadimplentes} layout="vertical" onClick={() => setTabFocus("receber")}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Bar dataKey="vencido" fill={CHART_COLORS[4]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top 10 fornecedores por despesa">
          {isLoading ? <Skeleton className="h-[260px]" /> : topFornecedores.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topFornecedores} layout="vertical" onClick={() => setTabFocus("pagar")}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Bar dataKey="value" fill={CHART_COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Funil de recebimento">
          {isLoading ? <Skeleton className="h-[260px]" /> : funil.every((f) => f.value === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funil} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="stage" width={100} fontSize={11} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Bar dataKey="value">
                  {funil.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Conciliação bancária">
          {isLoading ? <Skeleton className="h-[260px]" /> : conciliacao.every((c) => c.value === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={conciliacao} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} onClick={() => setTabFocus("conciliacao")}>
                  {conciliacao.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[[2, 1, 4][i] ?? 0]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Tables */}
      <Tabs value={tabFocus?.startsWith("categoria") ? "receber" : tabFocus ?? "receber"} onValueChange={(v) => setTabFocus(v)}>
        <TabsList>
          <TabsTrigger value="receber">Receber críticas</TabsTrigger>
          <TabsTrigger value="pagar">Pagar críticas</TabsTrigger>
          <TabsTrigger value="conciliacao">Pend. conciliação</TabsTrigger>
          <TabsTrigger value="ranking">Ranking clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="receber">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Dias atraso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Próxima ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contasReceberCriticas.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem contas a receber críticas</TableCell></TableRow>
                  )}
                  {contasReceberCriticas.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.cliente}</TableCell>
                      <TableCell>{r.vencimento}</TableCell>
                      <TableCell className="text-right">{BRL(r.valor)}</TableCell>
                      <TableCell className="text-right">{r.dias > 0 ? <Badge variant="destructive">{r.dias}d</Badge> : r.dias}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      <TableCell>{r.acao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagar">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Dias atraso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contasPagarCriticas.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem contas a pagar críticas</TableCell></TableRow>
                  )}
                  {contasPagarCriticas.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.fornecedor}</TableCell>
                      <TableCell>{r.vencimento}</TableCell>
                      <TableCell className="text-right">{BRL(r.valor)}</TableCell>
                      <TableCell className="text-right">{r.dias > 0 ? <Badge variant="destructive">{r.dias}d</Badge> : r.dias}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={r.prioridade === "alta" ? "destructive" : r.prioridade === "média" ? "default" : "secondary"}>
                          {r.prioridade}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conciliacao">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendentesConciliacao.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Tudo conciliado</TableCell></TableRow>
                  )}
                  {pendentesConciliacao.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.data}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{r.descricao}</TableCell>
                      <TableCell className="text-right">{BRL(r.valor)}</TableCell>
                      <TableCell>{r.conta}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      <TableCell>{r.origem}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Recebida</TableHead>
                    <TableHead className="text-right">Em aberto</TableHead>
                    <TableHead className="text-right">Vencido</TableHead>
                    <TableHead className="text-right">Taxa pag.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClientes.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
                  )}
                  {topClientes
                    .sort((a, b) => b.receita - a.receita)
                    .slice(0, 20)
                    .map((c, i) => (
                      <TableRow key={i}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell className="text-right">{BRL(c.receita)}</TableCell>
                        <TableCell className="text-right">{BRL(c.receita - c.aberto)}</TableCell>
                        <TableCell className="text-right">{BRL(c.aberto)}</TableCell>
                        <TableCell className="text-right">{c.vencido > 0 ? <Badge variant="destructive">{BRL(c.vencido)}</Badge> : BRL(0)}</TableCell>
                        <TableCell className="text-right">{PCT(c.taxaPag)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Insights Financeiros</CardTitle>
          </div>
          <CardDescription>Sinais calculados a partir dos filtros atuais.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {insights.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem alertas relevantes no período.</p>
          )}
          {insights.map((ins, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{ins.titulo}</p>
                <Badge variant={ins.severidade === "alta" ? "destructive" : ins.severidade === "media" ? "default" : "secondary"}>
                  {ins.severidade}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{ins.descricao}</p>
              <p className="text-xs"><span className="text-muted-foreground">Ação sugerida: </span>{ins.acao}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- subcomponents ----------
function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          {Icon && <Icon className={`h-4 w-4 ${toneClass}`} />}
        </div>
        <p className={`text-lg font-semibold leading-tight ${toneClass}`} title={value}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="bg-[#1a2233]/40 backdrop-blur-xl border border-white/5 shadow-2xl overflow-hidden group">
      <CardHeader className="pb-4 border-b border-white/5">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white/70 transition-colors">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}


function Empty() {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      <div className="text-center">
        <CalendarRange className="mx-auto mb-2 h-6 w-6" />
        Sem dados para os filtros atuais
      </div>
    </div>
  );
}
