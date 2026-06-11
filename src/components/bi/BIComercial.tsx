import { useMemo, useState, cloneElement } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
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
  Area,
  AreaChart,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CalendarRange,
  Clock,
  Eraser,
  ExternalLink,
  Filter,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, ShieldAlert } from "lucide-react";
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
import { STATUS_LABELS, ALL_STATUSES } from "@/lib/devisStatus";

import { formatDevisCode } from "@/lib/formatDevis";

// ----- helpers -----
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

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#0ea5e9", // Sky
  "#ec4899", // Pink
  "#6366f1", // Indigo
];

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-3 shadow-lg rounded-lg ring-1 ring-slate-100">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-medium text-slate-600">{entry.name}</span>
              </div>
              <span className="text-xs font-bold text-slate-900">
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


type Devis = {
  id: string;
  devis_number: string | null;
  title: string;
  status: string;
  total_amount: number | null;
  business_unit: string | null;
  responsible_sector: string | null;
  service_type: string | null;
  client_id: string | null;
  commercial_responsible: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  meeting_date: string | null;
  deadline_date: string | null;
  devis_service_areas?: { area_slug: string }[];
};

type Filters = {
  from: string;
  to: string;
  responsible: string;
  clientId: string;
  status: string;
  bu: string;
  area: string;
  serviceType: string;
  search?: string;
};

const start6 = new Date();
start6.setMonth(start6.getMonth() - 5);
start6.setDate(1);
const defaultFilters: Filters = {
  from: start6.toISOString().slice(0, 10),
  to: today(),
  responsible: "all",
  clientId: "all",
  status: "all",
  bu: "all",
  area: "all",
  serviceType: "all",
};

const ACCEPTED = ["aceita", "aprovado", "convertido", "cobranca_pendente", "entrada_recebida", "enviado_para_operacao"];
const REJECTED = ["rejeitada", "rejeitado"];
const NEGOTIATION = ["enviada_ao_cliente", "aguardando_aceite", "enviado"];
const SENT_OR_LATER = [...ACCEPTED, ...REJECTED, ...NEGOTIATION];

export default function BIComercial() {
  const cats = useFinanceiroCatalogs();
  const { filterCode: companyCode } = useCompany();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [tabFocus, setTabFocus] = useState<string>("funil");

  const businessUnits = useQuery({
    queryKey: ["bi-com", "bus"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("business_units").select("code, name").order("name");
      if (error) throw error;
      return (data ?? []) as { code: string; name: string }[];
    },
  });

  const q = useQuery({
    queryKey: ["bi-com", filters, companyCode],
    queryFn: async () => {
      let qb = supabase
        .from("devis")
        .select(
          "id, devis_number, title, status, total_amount, business_unit, responsible_sector, service_type, client_id, commercial_responsible, created_at, updated_at, sent_at, accepted_at, rejected_at, meeting_date, deadline_date, devis_service_areas(area_slug)"
        )
        .gte("created_at", filters.from)
        .lte("created_at", filters.to + "T23:59:59")
        .limit(10000);
      if (filters.responsible !== "all") qb = qb.eq("commercial_responsible", filters.responsible);
      if (filters.clientId !== "all") qb = qb.eq("client_id", filters.clientId);
      if (filters.status !== "all") qb = qb.eq("status", filters.status as any);
      const effectiveBu = companyCode ?? (filters.bu !== "all" ? filters.bu : null);
      if (effectiveBu) qb = qb.eq("business_unit", effectiveBu);
      if (filters.area !== "all") qb = qb.eq("responsible_sector", filters.area);
      if (filters.serviceType !== "all") qb = qb.eq("service_type", filters.serviceType);
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as Devis[];
    },
  });

  const rows = q.data ?? [];
  const isLoading = q.isLoading;

  const clientName = (id: string | null) => cats.clients.find((c) => c.id === id)?.name ?? "—";

  const responsibles = useMemo(
    () => Array.from(new Set(rows.map((r) => r.commercial_responsible).filter(Boolean) as string[])).sort(),
    [rows]
  );
  const serviceTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.service_type).filter(Boolean) as string[])).sort(),
    [rows]
  );

  // ----- KPIs -----
  const agg = useMemo(() => {
    const total = rows.length;
    const enviadas = rows.filter((r) => r.sent_at || SENT_OR_LATER.includes(r.status)).length;
    const aceitas = rows.filter((r) => ACCEPTED.includes(r.status) || r.accepted_at).length;
    const recusadas = rows.filter((r) => REJECTED.includes(r.status) || r.rejected_at).length;
    const emNeg = rows.filter((r) => NEGOTIATION.includes(r.status)).length;
    const conversao = enviadas > 0 ? aceitas / enviadas : 0;
    const valorPropTotal = rows.reduce((a, b) => a + Number(b.total_amount ?? 0), 0);
    const valorAceitoTotal = rows
      .filter((r) => ACCEPTED.includes(r.status) || r.accepted_at)
      .reduce((a, b) => a + Number(b.total_amount ?? 0), 0);
    const ticketProp = total > 0 ? valorPropTotal / total : 0;
    const ticketAceito = aceitas > 0 ? valorAceitoTotal / aceitas : 0;
    const tempos = rows
      .filter((r) => r.accepted_at && r.created_at)
      .map((r) => daysBetween(r.created_at, r.accepted_at!));
    const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
    const tdy = today();
    const paradas = rows.filter(
      (r) =>
        !ACCEPTED.includes(r.status) &&
        !REJECTED.includes(r.status) &&
        daysBetween(r.updated_at, tdy) > 14
    ).length;
    const vencidas = rows.filter(
      (r) =>
        !ACCEPTED.includes(r.status) &&
        !REJECTED.includes(r.status) &&
        r.deadline_date &&
        r.deadline_date < tdy
    ).length;

    const byResp = new Map<string, { aceitas: number; valor: number }>();
    for (const r of rows.filter((r) => ACCEPTED.includes(r.status) || r.accepted_at)) {
      const k = r.commercial_responsible || "—";
      if (!byResp.has(k)) byResp.set(k, { aceitas: 0, valor: 0 });
      const b = byResp.get(k)!;
      b.aceitas++;
      b.valor += Number(r.total_amount ?? 0);
    }
    const melhorVend = Array.from(byResp.entries()).sort((a, b) => b[1].valor - a[1].valor)[0];

    const byServ = new Map<string, number>();
    for (const r of rows.filter((r) => ACCEPTED.includes(r.status) || r.accepted_at)) {
      const k = r.service_type || "—";
      byServ.set(k, (byServ.get(k) ?? 0) + Number(r.total_amount ?? 0));
    }
    const principalServ = Array.from(byServ.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      enviadas,
      aceitas,
      recusadas,
      emNeg,
      conversao,
      valorPropTotal,
      valorAceitoTotal,
      ticketProp,
      ticketAceito,
      tempoMedio,
      paradas,
      vencidas,
      melhorVend: melhorVend ? { name: melhorVend[0], valor: melhorVend[1].valor } : null,
      principalServ: principalServ ? { name: principalServ[0], valor: principalServ[1] } : null,
    };
  }, [rows]);

  // ----- Funnel -----
  const funnel = useMemo(() => {
    const counts = {
      Criada: rows.length,
      "Em elaboração": rows.filter((r) =>
        ["rascunho", "reuniao_realizada", "proposta_em_geracao", "aguardando_validacao", "pronta_para_envio"].includes(r.status)
      ).length,
      Enviada: rows.filter((r) => r.sent_at || SENT_OR_LATER.includes(r.status)).length,
      Visualizada: rows.filter((r) => r.sent_at).length, // fallback: assumimos visualizada quando enviada
      "Em negociação": rows.filter((r) => NEGOTIATION.includes(r.status)).length,
      Aceita: rows.filter((r) => ACCEPTED.includes(r.status) || r.accepted_at).length,
      Recusada: rows.filter((r) => REJECTED.includes(r.status) || r.rejected_at).length,
    };
    return Object.entries(counts).map(([stage, value]) => ({ stage, value }));
  }, [rows]);

  // ----- Monthly series -----
  const monthly = useMemo(() => {
    const map = new Map<string, { k: string; [key: string]: any }>();
    const buCodes = Array.from(new Set(rows.map(r => r.business_unit).filter(Boolean)));

    for (const r of rows) {
      const k = monthKey(new Date(r.created_at));
      if (!map.has(k)) {
        const entry: any = { k, criadas: 0, aceitas: 0, valorProp: 0, valorAceito: 0 };
        buCodes.forEach(code => {
          entry[`criadas_${code}`] = 0;
          entry[`valorAceito_${code}`] = 0;
        });
        map.set(k, entry);
      }
      const b = map.get(k)!;
      b.criadas++;
      b.valorProp += Number(r.total_amount ?? 0);
      if (r.business_unit) b[`criadas_${r.business_unit}`]++;

      if (ACCEPTED.includes(r.status) || r.accepted_at) {
        const ka = r.accepted_at ? monthKey(new Date(r.accepted_at)) : k;
        if (!map.has(ka)) {
          const entry: any = { k: ka, criadas: 0, aceitas: 0, valorProp: 0, valorAceito: 0 };
          buCodes.forEach(code => {
            entry[`criadas_${code}`] = 0;
            entry[`valorAceito_${code}`] = 0;
          });
          map.set(ka, entry);
        }
        const ba = map.get(ka)!;
        ba.aceitas++;
        ba.valorAceito += Number(r.total_amount ?? 0);
        if (r.business_unit) ba[`valorAceito_${r.business_unit}`] += Number(r.total_amount ?? 0);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => a.k.localeCompare(b.k))
      .map((b) => ({
        month: monthLabel(b.k),
        ...b,
        Resultado: b.valorAceito, // Para compatibilidade se necessário
        Criadas: b.criadas,
        Aceitas: b.aceitas,
        "Valor proposto": b.valorProp,
        "Valor aceito": b.valorAceito,
      }));
  }, [rows]);

  // ----- Rankings -----
  const rankingClientes = useMemo(() => {
    const m = new Map<string, { proposto: number; aceito: number; qtd: number; qtdAceitas: number }>();
    for (const r of rows) {
      const id = r.client_id || "—";
      if (!m.has(id)) m.set(id, { proposto: 0, aceito: 0, qtd: 0, qtdAceitas: 0 });
      const b = m.get(id)!;
      b.qtd++;
      b.proposto += Number(r.total_amount ?? 0);
      if (ACCEPTED.includes(r.status) || r.accepted_at) {
        b.qtdAceitas++;
        b.aceito += Number(r.total_amount ?? 0);
      }
    }
    return Array.from(m.entries()).map(([id, v]) => ({
      name: clientName(id),
      ...v,
      conversao: v.qtd > 0 ? v.qtdAceitas / v.qtd : 0,
    }));
  }, [rows, cats.clients]);

  const top10ClientesProp = [...rankingClientes].sort((a, b) => b.proposto - a.proposto).slice(0, 10);
  const top10ClientesAceito = [...rankingClientes].sort((a, b) => b.aceito - a.aceito).slice(0, 10);

  const rankingServicos = useMemo(() => {
    const m = new Map<string, { qtd: number; qtdAceitas: number; proposto: number; aceito: number }>();
    for (const r of rows) {
      const k = r.service_type || "—";
      if (!m.has(k)) m.set(k, { qtd: 0, qtdAceitas: 0, proposto: 0, aceito: 0 });
      const b = m.get(k)!;
      b.qtd++;
      b.proposto += Number(r.total_amount ?? 0);
      if (ACCEPTED.includes(r.status) || r.accepted_at) {
        b.qtdAceitas++;
        b.aceito += Number(r.total_amount ?? 0);
      }
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, ...v, conversao: v.qtd > 0 ? v.qtdAceitas / v.qtd : 0 }))
      .sort((a, b) => b.aceito - a.aceito);
  }, [rows]);

  const perfResponsaveis = useMemo(() => {
    const m = new Map<string, { criadas: number; aceitas: number; valor: number }>();
    for (const r of rows) {
      const k = r.commercial_responsible || "—";
      if (!m.has(k)) m.set(k, { criadas: 0, aceitas: 0, valor: 0 });
      const b = m.get(k)!;
      b.criadas++;
      if (ACCEPTED.includes(r.status) || r.accepted_at) {
        b.aceitas++;
        b.valor += Number(r.total_amount ?? 0);
      }
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({
        name,
        ...v,
        conversao: v.criadas > 0 ? v.aceitas / v.criadas : 0,
        ticket: v.aceitas > 0 ? v.valor / v.aceitas : 0,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [rows]);

  const statusDist = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.status, (m.get(r.status) ?? 0) + 1);
    return Array.from(m.entries()).map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v }));
  }, [rows]);

  const receitaPorServico = useMemo(() => {
    return rankingServicos.map((s) => ({ name: s.name, value: s.aceito })).filter((x) => x.value > 0).slice(0, 8);
  }, [rankingServicos]);

  const statsPorEmpresa = useMemo(() => {
    const m = new Map<string, { criadas: number; aceitas: number; valorProp: number; valorAceito: number; enviadas: number }>();
    for (const r of rows) {
      const k = r.business_unit ?? "Não informada";
      if (!m.has(k)) m.set(k, { criadas: 0, aceitas: 0, valorProp: 0, valorAceito: 0, enviadas: 0 });
      const b = m.get(k)!;
      b.criadas++;
      b.valorProp += Number(r.total_amount ?? 0);
      if (r.sent_at || SENT_OR_LATER.includes(r.status)) b.enviadas++;
      if (ACCEPTED.includes(r.status) || r.accepted_at) {
        b.aceitas++;
        b.valorAceito += Number(r.total_amount ?? 0);
      }
    }
    return Array.from(m.entries()).map(([name, v]) => ({
      name,
      ...v,
      conversao: v.enviadas > 0 ? v.aceitas / v.enviadas : 0,
      ticket: v.aceitas > 0 ? v.valorAceito / v.aceitas : 0,
    })).sort((a, b) => b.valorAceito - a.valorAceito);
  }, [rows]);

  const statsPorArea = useMemo(() => {
    const m = new Map<string, { criadas: number; aceitas: number; valorProp: number; valorAceito: number; enviadas: number }>();
    for (const r of rows) {
      const areas = r.devis_service_areas?.length 
        ? r.devis_service_areas.map(a => a.area_slug)
        : [r.responsible_sector].filter(Boolean);
      
      const areasToProcess = areas.length > 0 ? areas : ["Não informada"];
      const areaCount = areasToProcess.length;
      
      for (const areaSlug of areasToProcess) {
        const areaInfo = findArea((r.business_unit as CompanyCode) || null, areaSlug || null);
        const k = areaInfo?.label ?? (areaSlug === "Não informada" ? "Não informada" : (areaSlug || "—"));
        
        if (!m.has(k)) m.set(k, { criadas: 0, aceitas: 0, valorProp: 0, valorAceito: 0, enviadas: 0 });
        const b = m.get(k)!;
        
        // Rateio proporcional simples
        b.criadas += 1 / areaCount;
        b.valorProp += (Number(r.total_amount ?? 0)) / areaCount;
        if (r.sent_at || SENT_OR_LATER.includes(r.status)) b.enviadas += 1 / areaCount;
        if (ACCEPTED.includes(r.status) || r.accepted_at) {
          b.aceitas += 1 / areaCount;
          b.valorAceito += (Number(r.total_amount ?? 0)) / areaCount;
        }
      }
    }
    return Array.from(m.entries()).map(([name, v]) => ({
      name,
      ...v,
      conversao: v.enviadas > 0 ? v.aceitas / v.enviadas : 0,
      ticket: v.aceitas > 0 ? v.valorAceito / v.aceitas : 0,
    })).sort((a, b) => b.valorAceito - a.valorAceito);
  }, [rows]);

  // Heatmap simples: volume por dia da semana
  const heatmap = useMemo(() => {
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const v = Array(7).fill(0);
    for (const r of rows) v[new Date(r.created_at).getDay()]++;
    const max = Math.max(...v, 1);
    return dias.map((d, i) => ({ dia: d, qtd: v[i], pct: v[i] / max }));
  }, [rows]);

  // ----- Tabelas críticas -----
  const criticas = useMemo(() => {
    const tdy = today();
    return rows
      .filter((r) => !ACCEPTED.includes(r.status) && !REJECTED.includes(r.status))
      .map((r) => {
        const diasParada = daysBetween(r.updated_at, tdy);
        const vencida = !!(r.deadline_date && r.deadline_date < tdy);
        return {
          id: r.id,
          cliente: clientName(r.client_id),
          numero: formatDevisCode(r.devis_number, r.id),
          status: r.status,
          valor: Number(r.total_amount ?? 0),
          criada: r.created_at.slice(0, 10),
          atualizada: r.updated_at.slice(0, 10),
          diasParada,
          vencida,
          acao:
            vencida ? "Renegociar prazo" : diasParada > 14 ? "Acionar cliente" : diasParada > 7 ? "Follow-up" : "Acompanhar",
        };
      })
      .sort((a, b) => b.diasParada - a.diasParada)
      .slice(0, 25);
  }, [rows, cats.clients]);

  // ----- Insights -----
  const insights = useMemo(() => {
    const list: { titulo: string; descricao: string; severidade: "baixa" | "media" | "alta"; acao: string }[] = [];
    // Conversão vs período anterior (mesmo intervalo de tempo, deslocado)
    if (monthly.length >= 2) {
      const last = monthly[monthly.length - 1];
      const prev = monthly[monthly.length - 2];
      const convCur = last.Criadas > 0 ? last.Aceitas / last.Criadas : 0;
      const convPrev = prev.Criadas > 0 ? prev.Aceitas / prev.Criadas : 0;
      if (convPrev > 0) {
        const delta = convCur - convPrev;
        if (delta < -0.05)
          list.push({
            titulo: "Conversão em queda",
            descricao: `Taxa caiu ${PCT(Math.abs(delta))} em relação ao mês anterior.`,
            severidade: delta < -0.15 ? "alta" : "media",
            acao: "Revisar argumentos comerciais e qualificação de leads.",
          });
        if (last.Aceitas > 0 && prev.Aceitas > 0) {
          const ticketCur = last["Valor aceito"] / last.Aceitas;
          const ticketPrev = prev["Valor aceito"] / prev.Aceitas;
          if (ticketPrev > 0) {
            const dt = (ticketCur - ticketPrev) / ticketPrev;
            if (Math.abs(dt) > 0.1)
              list.push({
                titulo: dt > 0 ? "Ticket médio em alta" : "Ticket médio em queda",
                descricao: `Ticket aceito ${dt > 0 ? "subiu" : "caiu"} ${PCT(Math.abs(dt))} no mês.`,
                severidade: dt < -0.2 ? "alta" : "baixa",
                acao: dt > 0 ? "Replicar ofertas premium." : "Avaliar descontos aplicados.",
              });
          }
        }
      }
    }
    // Propostas em negociação há mais de 14 dias
    const tdy = today();
    const negTravadas = rows.filter(
      (r) => NEGOTIATION.includes(r.status) && daysBetween(r.updated_at, tdy) > 14
    ).length;
    if (negTravadas > 0)
      list.push({
        titulo: "Negociações travadas",
        descricao: `${negTravadas} propostas em negociação há mais de 14 dias.`,
        severidade: negTravadas > 5 ? "alta" : "media",
        acao: "Disparar follow-up imediato.",
      });
    // Cliente com alto valor em aberto
    const maiorAberto = [...rankingClientes].sort((a, b) => (b.proposto - b.aceito) - (a.proposto - a.aceito))[0];
    if (maiorAberto && maiorAberto.proposto - maiorAberto.aceito > 0)
      list.push({
        titulo: "Cliente com alto valor em aberto",
        descricao: `${maiorAberto.name} tem ${BRL(maiorAberto.proposto - maiorAberto.aceito)} em propostas pendentes.`,
        severidade: "media",
        acao: "Priorizar follow-up dedicado.",
      });
    // Serviço com maior conversão
    const servCom = rankingServicos.filter((s) => s.qtd >= 3).sort((a, b) => b.conversao - a.conversao)[0];
    if (servCom)
      list.push({
        titulo: "Serviço campeão de conversão",
        descricao: `${servCom.name} converte ${PCT(servCom.conversao)} das propostas.`,
        severidade: "baixa",
        acao: "Investir em campanhas para esse serviço.",
      });
    // Serviço com volume alto e baixa conversão
    const servBaixa = rankingServicos
      .filter((s) => s.qtd >= 5 && s.conversao < 0.2)
      .sort((a, b) => b.qtd - a.qtd)[0];
    if (servBaixa)
      list.push({
        titulo: "Serviço com baixa conversão",
        descricao: `${servBaixa.name}: ${servBaixa.qtd} propostas, ${PCT(servBaixa.conversao)} de conversão.`,
        severidade: "media",
        acao: "Revisar pitch ou precificação.",
      });
    // Responsável com maior crescimento (em valor aceito)
    if (perfResponsaveis.length > 0) {
      const top = perfResponsaveis[0];
      list.push({
        titulo: "Destaque comercial",
        descricao: `${top.name} lidera com ${BRL(top.valor)} aceitos e ${PCT(top.conversao)} de conversão.`,
        severidade: "baixa",
        acao: "Reconhecer e compartilhar boas práticas.",
      });
    }
    // Vencidas / sem follow-up
    const vencidas = rows.filter(
      (r) =>
        !ACCEPTED.includes(r.status) &&
        !REJECTED.includes(r.status) &&
        r.deadline_date &&
        r.deadline_date < tdy
    ).length;
    if (vencidas > 0)
      list.push({
        titulo: "Propostas vencidas",
        descricao: `${vencidas} propostas passaram do prazo sem fechamento.`,
        severidade: "alta",
        acao: "Reabrir negociação ou marcar como perdida.",
      });
    // Funil travando
    const funilGap = (() => {
      const f = funnel.map((x) => x.value);
      if (f[2] === 0) return null;
      const dropNeg = f[2] - f[4]; // Enviada -> Em negociação
      const dropAceita = (f[4] || f[2]) - f[5]; // negociação -> aceita
      if (dropAceita > dropNeg && dropAceita > 3) return "Aceite";
      if (dropNeg > 3) return "Negociação";
      return null;
    })();
    if (funilGap)
      list.push({
        titulo: `Funil travando em "${funilGap}"`,
        descricao: `Maior gargalo identificado na etapa de ${funilGap.toLowerCase()}.`,
        severidade: "media",
        acao: "Treinar time para superar objeções nessa etapa.",
      });
    return list;
  }, [rows, monthly, rankingClientes, rankingServicos, perfResponsaveis, funnel]);

  const clearFilters = () => setFilters(defaultFilters);

  const exportCSV = () => {
    const cols = ["id", "devis_number", "title", "status", "total_amount", "client_id", "commercial_responsible", "created_at", "sent_at", "accepted_at", "rejected_at"];
    const lines = [cols.join(",")];
    for (const r of rows) {
      const rowData = { ...r } as any;
      rowData.devis_number = formatDevisCode(r.devis_number, r.id);
      lines.push(cols.map((c) => JSON.stringify(rowData[c] ?? "")).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bi-comercial-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ----- render -----
  return (
    <div className="space-y-6">
      <ActiveCompanyBanner />
      {/* Filtros */}
      <Card className="bg-[#1a2233]/40 backdrop-blur-xl border border-white/5 shadow-2xl overflow-hidden group hover:border-white/10 transition-all duration-500">
        <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.01] flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
              <Filter className="h-3.5 w-3.5 text-white/70" />
            </div>
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#E2E8F0] group-hover:text-white transition-colors">Filtros Comerciais</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 border border-white/10 transition-all" onClick={exportCSV}>Exportar</Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
            >
              <Eraser className="h-3 w-3 mr-2" /> Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-6">


          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#E2E8F0] mb-2 block">De</Label>
            <Input type="date" className="bg-white/5 border-white/10 text-white focus:ring-primary/20" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#E2E8F0] mb-2 block">Até</Label>
            <Input type="date" className="bg-white/5 border-white/10 text-white focus:ring-primary/20" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#E2E8F0] mb-2 block">Responsável</Label>
            <Select value={filters.responsible} onValueChange={(v) => setFilters({ ...filters, responsible: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-primary/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {responsibles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#E2E8F0] mb-2 block">Cliente</Label>
            <Select value={filters.clientId} onValueChange={(v) => setFilters({ ...filters, clientId: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-primary/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {cats.clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#E2E8F0] mb-2 block">Status</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-primary/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#E2E8F0] mb-2 block">Unidade de negócio</Label>
            <Select value={filters.bu} onValueChange={(v) => setFilters({ ...filters, bu: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-primary/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(businessUnits.data ?? []).map((b) => (
                  <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#E2E8F0] mb-2 block">Área principal</Label>
            <Select value={filters.area} onValueChange={(v) => setFilters({ ...filters, area: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-primary/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {getAreasFor(filters.bu === "all" ? null : (filters.bu as CompanyCode)).map((a) => (
                  <SelectItem key={a.slug} value={a.slug}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#E2E8F0] mb-2 block">Tipo de serviço</Label>
            <Select value={filters.serviceType} onValueChange={(v) => setFilters({ ...filters, serviceType: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-primary/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {serviceTypes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Modernos */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

        {[
          { 
            label: "PROPOSTAS TOTAIS", 
            value: agg.total, 
            sub: "Volume no período",
            icon: FileText, 
            color: "purple", 
            trend: "neutral",
            trendValue: ""
          },
          { 
            label: "CONVERSÃO MÉDIA", 
            value: PCT(agg.conversao), 
            sub: "vs total enviadas",
            icon: Target, 
            color: "sky", 
            trend: agg.conversao > 0.3 ? "pos" : "neutral",
            trendValue: "Ideal > 30%"
          },
          { 
            label: "VALOR ACEITO", 
            value: BRL(agg.valorAceitoTotal), 
            sub: `${agg.aceitas} fechadas`,
            icon: Trophy, 
            color: "emerald", 
            trend: "pos",
            trendValue: ""
          },
          { 
            label: "TICKET MÉDIO", 
            value: BRL(agg.ticketAceito), 
            sub: "Por proposta aceita",
            icon: Activity, 
            color: "indigo",
            trend: "neutral",
            trendValue: ""
          },
        ].map((kpi, i) => (
          <Card key={i} className="group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] border border-white/5 bg-[#1a2233]/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
            <div className={cn(
              "absolute -right-8 -top-8 h-32 w-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-30 transition-all duration-700",
              kpi.color === "purple" ? "bg-purple-500" : 
              kpi.color === "sky" ? "bg-sky-500" : 
              kpi.color === "emerald" ? "bg-emerald-500" : 
              kpi.color === "indigo" ? "bg-indigo-500" : "bg-white"
            )} />

            {/* Micro Inner Shadow */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />

            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[0.25em] text-[#94A3B8] group-hover:text-[#CBD5E1] transition-colors uppercase">
                    {kpi.label}
                  </span>
                  <div className={cn(
                    "p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 group-hover:text-white transition-all duration-500 shadow-sm",
                    kpi.color === "purple" ? "group-hover:bg-purple-500/20 group-hover:border-purple-500/30 group-hover:text-purple-400 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]" :
                    kpi.color === "sky" ? "group-hover:bg-sky-500/20 group-hover:border-sky-500/30 group-hover:text-sky-400 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.2)]" :
                    kpi.color === "emerald" ? "group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 group-hover:text-emerald-400 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]" :
                    kpi.color === "indigo" ? "group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 group-hover:text-indigo-400 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]" : ""
                  )}>
                    <kpi.icon className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-4xl font-bold tracking-tight text-white leading-none">
                    {kpi.value}
                  </h2>
                  <div className="flex items-center gap-3">
                    {kpi.trend !== "neutral" && (
                      <div className={cn(
                        "flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset",
                        kpi.trend === "pos" ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" : "bg-rose-500/10 text-rose-400 ring-rose-500/20"
                      )}>
                        {kpi.trend === "pos" ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                        {kpi.trendValue}
                      </div>
                    )}
                    <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide">
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
            label: "EM NEGOCIAÇÃO", 
            value: agg.emNeg, 
            sub: BRL(rows.filter(r => NEGOTIATION.includes(r.status)).reduce((a, b) => a + Number(b.total_amount ?? 0), 0)),
            icon: Clock, 
            color: "orange"
          },
          { 
            label: "TEMPO MÉDIO", 
            value: `${agg.tempoMedio.toFixed(1)} d`, 
            sub: "Ciclo de conversão",
            icon: CalendarRange, 
            color: "blue"
          },
          { 
            label: "PROP. PARADAS", 
            value: agg.paradas, 
            sub: "Sem interações > 14d",
            icon: AlertTriangle, 
            color: "rose"
          },
          { 
            label: "VENCIDAS", 
            value: agg.vencidas, 
            sub: "Atraso no fechamento",
            icon: ShieldAlert, 
            color: "red"
          },
        ].map((kpi, i) => (
          <Card key={i} className="group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] border border-white/5 bg-[#1a2233]/40 backdrop-blur-xl shadow-2xl">
            <div className={cn(
              "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-all duration-700",
              kpi.color === "orange" ? "bg-orange-500" : 
              kpi.color === "blue" ? "bg-blue-500" : 
              kpi.color === "rose" ? "bg-rose-500" : 
              kpi.color === "red" ? "bg-red-500" : "bg-white"
            )} />

            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors uppercase">
                    {kpi.label}
                  </span>
                  <div className={cn(
                    "p-2 rounded-lg bg-white/5 border border-white/5 text-white/50 group-hover:text-white transition-all duration-500",
                    kpi.color === "orange" ? "group-hover:bg-orange-500/20 group-hover:border-orange-500/20 group-hover:text-orange-400" :
                    kpi.color === "blue" ? "group-hover:bg-blue-500/20 group-hover:border-blue-500/20 group-hover:text-blue-400" :
                    kpi.color === "rose" ? "group-hover:bg-rose-500/20 group-hover:border-rose-500/20 group-hover:text-rose-400" :
                    kpi.color === "red" ? "group-hover:bg-red-500/20 group-hover:border-red-500/20 group-hover:text-red-400" : ""
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

      <div className="grid gap-3 lg:grid-cols-2">

        <Card className="border border-white/5 shadow-2xl overflow-hidden relative bg-[#1a2233]/40 backdrop-blur-xl group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <CardHeader className="relative z-10 border-b border-white/5 bg-white/[0.02]">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white/70 transition-colors">Resumo por Empresa e Área</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 p-6">

            <div className="grid gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#CBD5E1] border-b border-white/10 pb-2">Por Empresa</h4>
                <div className="grid gap-2">
                  {statsPorEmpresa.slice(0, 5).map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-sm p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-white group-hover/item:text-primary transition-colors">{s.name}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{s.criadas} devis · Conv: {PCT(s.conversao)}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{BRL(s.valorAceito)}</div>
                        <div className="text-[10px] font-medium text-[#94A3B8]">Ticket: {BRL(s.ticket)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#CBD5E1] border-b border-white/10 pb-2">Por Área</h4>
                <div className="grid gap-2">
                  {statsPorArea.slice(0, 5).map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-sm p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group/item">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-white group-hover/item:text-primary transition-colors">{s.name}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{s.criadas} devis · Conv: {PCT(s.conversao)}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{BRL(s.valorAceito)}</div>
                        <div className="text-[10px] font-medium text-[#94A3B8]">Ticket: {BRL(s.ticket)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Participação das Empresas (Valor Aceito)">
          {isLoading ? <Skeleton className="h-[280px]" /> : statsPorEmpresa.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={statsPorEmpresa} 
                  dataKey="valorAceito" 
                  nameKey="name" 
                  innerRadius={70} 
                  outerRadius={100} 
                  paddingAngle={8}
                  stroke="none"
                >
                  {statsPorEmpresa.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={BRL} />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Participação das Áreas (Valor Aceito)">
          {isLoading ? <Skeleton className="h-[280px]" /> : statsPorArea.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={statsPorArea} 
                  dataKey="valorAceito" 
                  nameKey="name" 
                  innerRadius={60} 
                  outerRadius={100} 
                  paddingAngle={5}
                  stroke="none"
                >
                  {statsPorArea.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={BRL} />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Conversão por Empresa">
          {isLoading ? <Skeleton className="h-[280px]" /> : statsPorEmpresa.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statsPorEmpresa} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip content={<CustomTooltip formatter={PCT} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="conversao" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={30} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Conversão por Área">
          {isLoading ? <Skeleton className="h-[280px]" /> : statsPorArea.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statsPorArea} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip content={<CustomTooltip formatter={PCT} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="conversao" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Funil comercial">
          {isLoading ? <Skeleton className="h-[280px]" /> : funnel.every((f) => f.value === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnel} layout="vertical" onClick={(ev: any) => {
                const stage = ev?.activePayload?.[0]?.payload?.stage;
                if (stage) setTabFocus("criticas");
              }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis type="category" dataKey="stage" width={100} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.6)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Propostas criadas vs aceitas por mês">
          {isLoading ? <Skeleton className="h-[280px]" /> : monthly.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase' }} />
                <Line type="monotone" dataKey="Criadas" stroke="#8B5CF6" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="Aceitas" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Valor proposto x aceito por mês">
          {isLoading ? <Skeleton className="h-[280px]" /> : monthly.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} tickFormatter={(v) => BRL(v).split(',')[0]} />
                <Tooltip content={<CustomTooltip formatter={BRL} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase' }} />
                <Bar dataKey="Valor proposto" fill="#8B5CF6" fillOpacity={0.2} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Valor aceito" fill="#10B981" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Propostas por status">
          {isLoading ? <Skeleton className="h-[280px]" /> : statusDist.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} stroke="none">
                  {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>


        <ChartCard title="Top 10 clientes por valor proposto">
          {isLoading ? <Skeleton className="h-[280px]" /> : top10ClientesProp.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10ClientesProp} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} tickFormatter={(v) => BRL(v).split(',')[0]} />
                <YAxis type="category" dataKey="name" width={100} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.6)' }} />
                <Tooltip content={<CustomTooltip formatter={BRL} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="proposto" fill="#8B5CF6" fillOpacity={0.8} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top 10 clientes por valor aceito">
          {isLoading ? <Skeleton className="h-[280px]" /> : top10ClientesAceito.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10ClientesAceito} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} tickFormatter={(v) => BRL(v).split(',')[0]} />
                <YAxis type="category" dataKey="name" width={100} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.6)' }} />
                <Tooltip content={<CustomTooltip formatter={BRL} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="valorAceito" fill="#10B981" fillOpacity={0.8} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Evolução Mensal (Valor Aceito por Empresa)">
          {isLoading ? <Skeleton className="h-[280px]" /> : monthly.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} tickFormatter={(v) => BRL(v).split(',')[0]} />
                <Tooltip content={<CustomTooltip formatter={BRL} />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase' }} />

                {Array.from(new Set(rows.map(r => r.business_unit).filter(Boolean))).map((code, i) => (
                  <Line 
                    key={code!} 
                    type="monotone" 
                    dataKey={`valorAceito_${code}`} 
                    name={code!} 
                    stroke={COLORS[i % COLORS.length]} 
                    strokeWidth={2} 
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Performance por responsável">
          {isLoading ? <Skeleton className="h-[280px]" /> : perfResponsaveis.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={perfResponsaveis}
                layout="vertical"
                onClick={(ev: any) => {
                  const name = ev?.activePayload?.[0]?.payload?.name;
                  if (name && name !== "—") setFilters({ ...filters, responsible: name });
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Bar dataKey="valor" fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Receita aceita por tipo de serviço">
          {isLoading ? <Skeleton className="h-[280px]" /> : receitaPorServico.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={receitaPorServico} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100}>
                  {receitaPorServico.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Volume comercial por dia da semana">
          {isLoading ? <Skeleton className="h-[280px]" /> : rows.length === 0 ? <Empty /> : (
            <div className="grid grid-cols-7 gap-2 py-6">
              {heatmap.map((h) => (
                <div key={h.dia} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-md border"
                    style={{
                      height: 60,
                      background: `hsl(var(--primary) / ${0.15 + h.pct * 0.6})`,
                    }}
                    title={`${h.qtd} propostas`}
                  />
                  <p className="text-xs font-medium">{h.dia}</p>
                  <p className="text-xs text-white/40">{h.qtd}</p>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tabelas */}
      <Tabs value={tabFocus} onValueChange={setTabFocus}>
        <TabsList className="bg-[#1a2233]/40 border border-white/5 p-1 h-12 backdrop-blur-xl mb-6">
          <TabsTrigger value="criticas" className="data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold text-[10px] uppercase tracking-widest px-6 transition-all">Propostas críticas</TabsTrigger>
          <TabsTrigger value="clientes" className="data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold text-[10px] uppercase tracking-widest px-6 transition-all">Ranking clientes</TabsTrigger>
          <TabsTrigger value="servicos" className="data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold text-[10px] uppercase tracking-widest px-6 transition-all">Ranking serviços</TabsTrigger>
          <TabsTrigger value="responsaveis" className="data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold text-[10px] uppercase tracking-widest px-6 transition-all">Responsáveis</TabsTrigger>
        </TabsList>

        <TabsContent value="criticas">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-[#0b1526]/50">
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="text-[#F8FAFC] font-bold uppercase tracking-wider text-[10px] h-12">Cliente</TableHead>
                    <TableHead className="text-[#F8FAFC] font-bold uppercase tracking-wider text-[10px] h-12">Proposta</TableHead>
                    <TableHead className="text-[#F8FAFC] font-bold uppercase tracking-wider text-[10px] h-12">Status</TableHead>
                    <TableHead className="text-right text-[#F8FAFC] font-bold uppercase tracking-wider text-[10px] h-12">Valor</TableHead>
                    <TableHead className="text-[#F8FAFC] font-bold uppercase tracking-wider text-[10px] h-12">Criada</TableHead>
                    <TableHead className="text-[#F8FAFC] font-bold uppercase tracking-wider text-[10px] h-12">Atualizada</TableHead>
                    <TableHead className="text-right text-[#F8FAFC] font-bold uppercase tracking-wider text-[10px] h-12">Parada</TableHead>
                    <TableHead className="text-[#F8FAFC] font-bold uppercase tracking-wider text-[10px] h-12">Próxima ação</TableHead>
                    <TableHead className="h-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticas.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-white/40 py-6">Sem propostas críticas</TableCell></TableRow>
                  )}
                  {criticas.map((r, i) => (
                    <TableRow key={r.id} className={cn(
                      "border-white/5 transition-colors group/row",
                      i % 2 === 0 ? "bg-white/[0.01]" : "bg-transparent",
                      "hover:bg-white/[0.04]"
                    )}>
                      <TableCell className="font-medium text-white group-hover/row:text-primary transition-colors">{r.cliente}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-white/90 font-mono text-[10px]">{r.numero}</TableCell>
                      <TableCell><Badge variant="outline" className="border-white/20 text-white/90">{STATUS_LABELS[r.status] ?? r.status}</Badge></TableCell>
                      <TableCell className="text-right text-white font-bold">{BRL(r.valor)}</TableCell>
                      <TableCell className="text-white/70 text-xs">{r.criada}</TableCell>
                      <TableCell className="text-white/70 text-xs">{r.atualizada}</TableCell>
                      <TableCell className="text-right text-white/90">
                        {r.diasParada > 14 ? <Badge variant="destructive" className="animate-pulse">{r.diasParada}d</Badge> : `${r.diasParada}d`}
                      </TableCell>
                      <TableCell className="text-white font-medium text-xs bg-white/5">{r.acao}</TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/comercial/devis/$id" params={{ id: r.id }}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Cliente</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Qtd</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Valor proposto</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Valor aceito</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Conversão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingClientes.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-white/40 py-6">Sem dados</TableCell></TableRow>
                  )}
                  {[...rankingClientes].sort((a, b) => b.aceito - a.aceito).slice(0, 20).map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-white/90 font-medium">{c.name}</TableCell>
                      <TableCell className="text-right text-white/70">{c.qtd}</TableCell>
                      <TableCell className="text-right text-white/90">{BRL(c.proposto)}</TableCell>
                      <TableCell className="text-right text-white font-bold">{BRL(c.aceito)}</TableCell>
                      <TableCell className="text-right text-white/90">{PCT(c.conversao)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicos">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Serviço</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Qtd</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Valor proposto</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Valor aceito</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Conversão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingServicos.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-white/40 py-6">Sem dados</TableCell></TableRow>
                  )}
                  {rankingServicos.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="text-right">{s.qtd}</TableCell>
                      <TableCell className="text-right">{BRL(s.proposto)}</TableCell>
                      <TableCell className="text-right">{BRL(s.aceito)}</TableCell>
                      <TableCell className="text-right">{PCT(s.conversao)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responsaveis">
          <Card className="bg-[#1a2233]/40 backdrop-blur-xl border border-white/5 shadow-2xl overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Responsável</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Criadas</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Aceitas</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Valor aceito</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Conversão</TableHead>
                    <TableHead className="text-right text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">Ticket médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perfResponsaveis.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-white/40 py-6">Sem dados</TableCell></TableRow>
                  )}
                  {perfResponsaveis.map((p, i) => (
                    <TableRow
                      key={i}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => p.name !== "—" && setFilters({ ...filters, responsible: p.name })}
                    >
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right">{p.criadas}</TableCell>
                      <TableCell className="text-right">{p.aceitas}</TableCell>
                      <TableCell className="text-right">{BRL(p.valor)}</TableCell>
                      <TableCell className="text-right">{PCT(p.conversao)}</TableCell>
                      <TableCell className="text-right">{BRL(p.ticket)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Insights */}
      <Card className="bg-[#1a2233]/40 backdrop-blur-xl border border-white/5 shadow-2xl overflow-hidden group">
        <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-white/40" />
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white/70 transition-colors">Insights Comerciais</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pt-6">

          {insights.length === 0 && <p className="text-sm text-white/40">Sem alertas relevantes no período.</p>}
          {insights.map((ins, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{ins.titulo}</p>
                <Badge variant={ins.severidade === "alta" ? "destructive" : ins.severidade === "media" ? "default" : "secondary"} className="text-white font-bold">
                  {ins.severidade}
                </Badge>
              </div>
              <p className="text-xs text-[#CBD5E1]">{ins.descricao}</p>
              <p className="text-xs"><span className="text-[#CBD5E1]">Ação sugerida: </span><span className="text-[#E2E8F0] font-medium">{ins.acao}</span></p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ----- subcomponents -----
function Kpi({
  label, value, sub, icon: Icon, tone,
}: { label: string; value: string; sub?: string; icon?: any; tone?: "positive" | "negative" }) {
  const toneClass = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-slate-600";
  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
          {Icon && <Icon className={`h-4 w-4 ${toneClass}`} />}
        </div>
        <p className="text-xl font-bold text-slate-900 leading-tight" title={value}>{value}</p>
        {sub && <p className="text-xs text-slate-400 font-medium">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group hover:border-slate-300 transition-all duration-300">
      <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/30">
        <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}


function Empty() {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-slate-400 italic">
      <div className="text-center">
        <div className="bg-slate-50 p-4 rounded-full mb-4 inline-block ring-1 ring-slate-100">
          <CalendarRange className="h-6 w-6 text-slate-300" />
        </div>
        <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Sem dados para o período selecionado</p>
      </div>
    </div>
  );
}

