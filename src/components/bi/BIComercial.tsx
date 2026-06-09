import { useMemo, useState } from "react";
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
  "hsl(var(--primary))",
  "hsl(217 91% 60%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(280 65% 60%)",
  "hsl(190 90% 50%)",
  "hsl(24 95% 53%)",
];

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
  const [tabFocus, setTabFocus] = useState<string>("criticas");

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
          "id, devis_number, title, status, total_amount, business_unit, responsible_sector, service_type, client_id, commercial_responsible, created_at, updated_at, sent_at, accepted_at, rejected_at, meeting_date, deadline_date"
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
    const map = new Map<string, { k: string; criadas: number; aceitas: number; valorProp: number; valorAceito: number }>();
    for (const r of rows) {
      const k = monthKey(new Date(r.created_at));
      if (!map.has(k)) map.set(k, { k, criadas: 0, aceitas: 0, valorProp: 0, valorAceito: 0 });
      const b = map.get(k)!;
      b.criadas++;
      b.valorProp += Number(r.total_amount ?? 0);
      if (ACCEPTED.includes(r.status) || r.accepted_at) {
        const ka = r.accepted_at ? monthKey(new Date(r.accepted_at)) : k;
        if (!map.has(ka)) map.set(ka, { k: ka, criadas: 0, aceitas: 0, valorProp: 0, valorAceito: 0 });
        const ba = map.get(ka)!;
        ba.aceitas++;
        ba.valorAceito += Number(r.total_amount ?? 0);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => a.k.localeCompare(b.k))
      .map((b) => ({
        month: monthLabel(b.k),
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
      const k = findArea(r.business_unit as CompanyCode, r.responsible_sector)?.label ?? "Não informada";
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
          numero: r.devis_number || r.title,
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
    for (const r of rows) lines.push(cols.map((c) => JSON.stringify((r as any)[c] ?? "")).join(","));
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Filtros comerciais</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>Exportar CSV</Button>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <Eraser className="h-4 w-4 mr-1" /> Limpar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Responsável</Label>
            <Select value={filters.responsible} onValueChange={(v) => setFilters({ ...filters, responsible: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {responsibles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
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
            <Label className="text-xs">Status</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>)}
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
            <Label className="text-xs">Área principal</Label>
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
            <Label className="text-xs">Tipo de serviço</Label>
            <Select value={filters.serviceType} onValueChange={(v) => setFilters({ ...filters, serviceType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {serviceTypes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Propostas criadas" value={String(agg.total)} icon={Sparkles} />
        <Kpi label="Enviadas" value={String(agg.enviadas)} icon={ArrowUpRight} />
        <Kpi label="Aceitas" value={String(agg.aceitas)} icon={Trophy} tone="positive" />
        <Kpi label="Recusadas" value={String(agg.recusadas)} icon={ArrowDownRight} tone="negative" />
        <Kpi label="Em negociação" value={String(agg.emNeg)} icon={Users} />
        <Kpi label="Taxa de conversão" value={PCT(agg.conversao)} icon={TrendingUp} />
        <Kpi label="Valor proposto" value={BRL(agg.valorPropTotal)} icon={Target} />
        <Kpi label="Valor aceito" value={BRL(agg.valorAceitoTotal)} icon={Trophy} tone="positive" />
        <Kpi label="Ticket médio proposto" value={BRL(agg.ticketProp)} />
        <Kpi label="Ticket médio aceito" value={BRL(agg.ticketAceito)} />
        <Kpi label="Tempo médio até aceite" value={`${agg.tempoMedio.toFixed(1)}d`} icon={Clock} />
        <Kpi label="Propostas paradas" value={String(agg.paradas)} icon={AlertTriangle} tone={agg.paradas > 5 ? "negative" : undefined} />
        <Kpi label="Propostas vencidas" value={String(agg.vencidas)} icon={AlertTriangle} tone={agg.vencidas > 0 ? "negative" : undefined} />
        <Kpi label="Melhor vendedor" value={agg.melhorVend?.name ?? "—"} sub={agg.melhorVend ? BRL(agg.melhorVend.valor) : ""} icon={Award} />
        <Kpi label="Principal serviço" value={agg.principalServ?.name ?? "—"} sub={agg.principalServ ? BRL(agg.principalServ.valor) : ""} />

        {/* Multi-company KPIs */}
        <Card className="col-span-full mt-4 bg-muted/20">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" /> Detalhamento por Empresa e Área
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground border-b pb-1">Por Empresa</h4>
                <div className="grid gap-2">
                  {statsPorEmpresa.slice(0, 5).map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground">{s.criadas} devis · Conv: {PCT(s.conversao)}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{BRL(s.valorAceito)}</div>
                        <div className="text-[10px] text-muted-foreground">Ticket: {BRL(s.ticket)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground border-b pb-1">Por Área</h4>
                <div className="grid gap-2">
                  {statsPorArea.slice(0, 5).map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground">{s.criadas} devis · Conv: {PCT(s.conversao)}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{BRL(s.valorAceito)}</div>
                        <div className="text-[10px] text-muted-foreground">Ticket: {BRL(s.ticket)}</div>
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
                <Pie data={statsPorEmpresa} dataKey="valorAceito" nameKey="name" innerRadius={55} outerRadius={100}>
                  {statsPorEmpresa.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Participação das Áreas (Valor Aceito)">
          {isLoading ? <Skeleton className="h-[280px]" /> : statsPorArea.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statsPorArea} dataKey="valorAceito" nameKey="name" innerRadius={55} outerRadius={100}>
                  {statsPorArea.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Conversão por Empresa">
          {isLoading ? <Skeleton className="h-[280px]" /> : statsPorEmpresa.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statsPorEmpresa}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip formatter={(v: any) => PCT(Number(v))} />
                <Bar dataKey="conversao" fill={COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Conversão por Área">
          {isLoading ? <Skeleton className="h-[280px]" /> : statsPorArea.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statsPorArea}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip formatter={(v: any) => PCT(Number(v))} />
                <Bar dataKey="conversao" fill={COLORS[2]} />
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
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="stage" width={110} fontSize={11} />
                <Tooltip />
                <Bar dataKey="value">
                  {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Propostas criadas vs aceitas por mês">
          {isLoading ? <Skeleton className="h-[280px]" /> : monthly.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Criadas" stroke={COLORS[0]} strokeWidth={2} />
                <Line type="monotone" dataKey="Aceitas" stroke={COLORS[2]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Valor proposto x aceito por mês">
          {isLoading ? <Skeleton className="h-[280px]" /> : monthly.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Legend />
                <Bar dataKey="Valor proposto" fill={COLORS[1]} />
                <Bar dataKey="Valor aceito" fill={COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Propostas por status">
          {isLoading ? <Skeleton className="h-[280px]" /> : statusDist.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100}>
                  {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top 10 clientes por valor proposto">
          {isLoading ? <Skeleton className="h-[280px]" /> : top10ClientesProp.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10ClientesProp} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Bar dataKey="proposto" fill={COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top 10 clientes por valor aceito">
          {isLoading ? <Skeleton className="h-[280px]" /> : top10ClientesAceito.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10ClientesAceito} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                <Tooltip formatter={(v: any) => BRL(Number(v))} />
                <Bar dataKey="aceito" fill={COLORS[2]} />
              </BarChart>
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
                  <p className="text-xs text-muted-foreground">{h.qtd}</p>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Tabelas */}
      <Tabs value={tabFocus} onValueChange={setTabFocus}>
        <TabsList>
          <TabsTrigger value="criticas">Propostas críticas</TabsTrigger>
          <TabsTrigger value="clientes">Ranking clientes</TabsTrigger>
          <TabsTrigger value="servicos">Ranking serviços</TabsTrigger>
          <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>
        </TabsList>

        <TabsContent value="criticas">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Proposta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Criada</TableHead>
                    <TableHead>Atualizada</TableHead>
                    <TableHead className="text-right">Parada</TableHead>
                    <TableHead>Próxima ação</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticas.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Sem propostas críticas</TableCell></TableRow>
                  )}
                  {criticas.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.cliente}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{r.numero}</TableCell>
                      <TableCell><Badge variant="outline">{STATUS_LABELS[r.status] ?? r.status}</Badge></TableCell>
                      <TableCell className="text-right">{BRL(r.valor)}</TableCell>
                      <TableCell>{r.criada}</TableCell>
                      <TableCell>{r.atualizada}</TableCell>
                      <TableCell className="text-right">
                        {r.diasParada > 14 ? <Badge variant="destructive">{r.diasParada}d</Badge> : `${r.diasParada}d`}
                      </TableCell>
                      <TableCell>{r.acao}</TableCell>
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
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Valor proposto</TableHead>
                    <TableHead className="text-right">Valor aceito</TableHead>
                    <TableHead className="text-right">Conversão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingClientes.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
                  )}
                  {[...rankingClientes].sort((a, b) => b.aceito - a.aceito).slice(0, 20).map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="text-right">{c.qtd}</TableCell>
                      <TableCell className="text-right">{BRL(c.proposto)}</TableCell>
                      <TableCell className="text-right">{BRL(c.aceito)}</TableCell>
                      <TableCell className="text-right">{PCT(c.conversao)}</TableCell>
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
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Valor proposto</TableHead>
                    <TableHead className="text-right">Valor aceito</TableHead>
                    <TableHead className="text-right">Conversão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingServicos.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
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
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Criadas</TableHead>
                    <TableHead className="text-right">Aceitas</TableHead>
                    <TableHead className="text-right">Valor aceito</TableHead>
                    <TableHead className="text-right">Conversão</TableHead>
                    <TableHead className="text-right">Ticket médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perfResponsaveis.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Insights Comerciais</CardTitle>
          </div>
          <CardDescription>Sinais calculados a partir dos filtros atuais.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {insights.length === 0 && <p className="text-sm text-muted-foreground">Sem alertas relevantes no período.</p>}
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

// ----- subcomponents -----
function Kpi({
  label, value, sub, icon: Icon, tone,
}: { label: string; value: string; sub?: string; icon?: any; tone?: "positive" | "negative" }) {
  const toneClass = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-foreground";
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
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty() {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
      <div className="text-center">
        <CalendarRange className="mx-auto mb-2 h-6 w-6" />
        Sem dados para os filtros atuais
      </div>
    </div>
  );
}
