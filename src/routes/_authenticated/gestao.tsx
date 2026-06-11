import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Briefcase, 
  ArrowUpRight, ArrowDownRight, Users, Target, Activity, 
  AlertTriangle, CheckCircle2, Building2, Calendar, LayoutDashboard,
  Filter, ChevronRight, PieChart as PieIcon, BarChart3, Wallet,
  FileText
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DREGerencial } from "@/components/bi/DREGerencial";
import { cn } from "@/lib/utils";
import { ActiveCompanyBanner } from "@/components/ActiveCompanyBanner";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

const BRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const PCT = (n: number) => `${(n * 100).toFixed(1)}%`;

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfMonthISO = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const startOfYearISO = () => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);

function StatCard({ title, value, subValue, icon: Icon, trend, trendValue, color = "primary" }: any) {
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-slate-500";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : null;

  return (
    <Card className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl bg-slate-50 border border-slate-100", `text-${color}-600`)}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div className={cn("flex items-center gap-0.5 text-xs font-bold", trendColor)}>
              {TrendIcon && <TrendIcon className="h-3 w-3" />}
              {trendValue}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{title}</p>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">{value}</h3>
          {subValue && <p className="text-xs text-slate-500 font-medium">{subValue}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Gestao() {
  const { filterCode: companyCode, activeLabel } = useCompany();
  const [timeframe, setTimeframe] = useState<"month" | "year">("month");

  // --- QUERIES ---

  const { data: financialData, isLoading: loadingFin } = useQuery({
    queryKey: ["ceo-central-fin", companyCode],
    queryFn: async () => {
      let qb = supabase
        .from("financial_entries")
        .select("entry_type, total_brl, paid_amount, open_amount, amount_in, amount_out, entry_date, due_date, dre_group, account_category_id, payment_status")
        .gte("entry_date", startOfYearISO());

      if (companyCode) qb = qb.eq("business_unit", companyCode);
      
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    }
  });

  const { data: commercialData, isLoading: loadingCom } = useQuery({
    queryKey: ["ceo-central-com", companyCode],
    queryFn: async () => {
      let qb = supabase
        .from("devis")
        .select("status, total_amount, created_at, accepted_at, service_type");

      if (companyCode) qb = qb.eq("business_unit", companyCode);
      
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    }
  });

  // --- ANALYTICS ---

  const agg = useMemo(() => {
    if (!financialData) return null;
    
    const tdy = todayISO();
    const curMonth = tdy.slice(0, 7);
    
    let recMes = 0, recAno = 0, desMes = 0, desAno = 0, aberto = 0, vencido = 0;
    const dreGroups = new Map<string, number>();

    for (const r of financialData) {
      const isMes = (r.entry_date || "").startsWith(curMonth);
      const valTotal = Number(r.total_brl || (r.entry_type === "receita" ? r.amount_in : r.amount_out) || 0);
      const valPago = Number(r.paid_amount || 0);
      const valAberto = Number(r.open_amount || Math.max(0, valTotal - valPago));

      if (r.entry_type === "receita") {
        recAno += valPago;
        if (isMes) recMes += valPago;
        aberto += valAberto;
        if (valAberto > 0 && r.due_date && r.due_date < tdy) vencido += valAberto;
      } else if (r.entry_type === "despesa") {
        desAno += valPago;
        if (isMes) desMes += valPago;
        
        if (r.dre_group) {
          dreGroups.set(r.dre_group, (dreGroups.get(r.dre_group) || 0) + valPago);
        }
      }
    }

    const resMes = recMes - desMes;
    const resAno = recAno - desAno;
    const margemMes = recMes > 0 ? resMes / recMes : 0;

    return { recMes, recAno, desMes, desAno, resMes, resAno, margemMes, aberto, vencido, dreGroups };
  }, [financialData]);

  const comm = useMemo(() => {
    if (!commercialData) return null;
    
    const ACCEPTED = ["aceita", "aprovado", "convertido", "cobranca_pendente", "entrada_recebida", "enviado_para_operacao"];
    const total = commercialData.length;
    const aceitas = commercialData.filter(d => ACCEPTED.includes(d.status || "")).length;
    const valorAceito = commercialData.filter(d => ACCEPTED.includes(d.status || "")).reduce((a, b) => a + Number(b.total_amount || 0), 0);
    const taxaConv = total > 0 ? aceitas / total : 0;
    const ticketMedio = aceitas > 0 ? valorAceito / aceitas : 0;

    return { total, aceitas, valorAceito, taxaConv, ticketMedio };
  }, [commercialData]);

  const dreChartData = useMemo(() => {
    if (!agg) return [];
    return Array.from(agg.dreGroups.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [agg]);

  if (loadingFin || loadingCom) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Activity className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-black font-display tracking-tight text-slate-900">
              Central do CEO
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <ActiveCompanyBanner />
             <p className="text-sm text-slate-500 font-medium italic border-l pl-3 border-slate-200">
               "Os dados são a bússola, a visão é o leme."
             </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <TabsList className="bg-slate-100/50 p-1 h-11">
            <TabsTrigger value="dashboard" className="gap-2 font-bold px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <LayoutDashboard className="h-4 w-4" /> Dashboard Geral
            </TabsTrigger>
            <TabsTrigger value="dre" className="gap-2 font-bold px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" /> DRE Gerencial
            </TabsTrigger>
          </TabsList>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <Button 
              variant={timeframe === "month" ? "default" : "ghost"} 
              size="sm" 
              className="rounded-lg h-8 text-xs font-bold"
              onClick={() => setTimeframe("month")}
            >
              Mês
            </Button>
            <Button 
              variant={timeframe === "year" ? "default" : "ghost"} 
              size="sm" 
              className="rounded-lg h-8 text-xs font-bold"
              onClick={() => setTimeframe("year")}
            >
              Ano
            </Button>
          </div>
        </div>

        <TabsContent value="dashboard" className="space-y-8 mt-0 border-none p-0">

      {/* KPI GRID */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard 
          title="Receita Realizada" 
          value={BRL(timeframe === "month" ? (agg?.recMes ?? 0) : (agg?.recAno ?? 0))} 
          subValue={timeframe === "month" ? "No mês atual" : "Acumulado no ano"}
          icon={TrendingUp}
          trend="up"
          trendValue="+12.5%"
          color="emerald"
        />
        <StatCard 
          title="Despesa Paga" 
          value={BRL(timeframe === "month" ? (agg?.desMes ?? 0) : (agg?.desAno ?? 0))} 
          subValue={timeframe === "month" ? "No mês atual" : "Acumulado no ano"}
          icon={TrendingDown}
          trend="down"
          trendValue="-2.3%"
          color="rose"
        />
        <StatCard 
          title="Resultado Líquido" 
          value={BRL(timeframe === "month" ? (agg?.resMes ?? 0) : (agg?.resAno ?? 0))} 
          subValue={timeframe === "month" ? `Margem: ${PCT(agg?.margemMes || 0)}` : "Resultado do ano"}
          icon={DollarSign}
          color="blue"
        />
        <StatCard 
          title="Contas a Receber" 
          value={BRL(agg?.aberto ?? 0)} 
          subValue={`Vencido: ${BRL(agg?.vencido ?? 0)}`}
          icon={Wallet}
          trend={agg?.vencido && agg.vencido > 0 ? "down" : "up"}
          trendValue={agg?.vencido && agg.vencido > 0 ? "Atenção" : "Em dia"}
          color="amber"
        />
        <StatCard 
          title="Taxa de Conversão" 
          value={PCT(comm?.taxaConv || 0)} 
          subValue={`Ticket Médio: ${BRL(comm?.ticketMedio ?? 0)}`}
          icon={Target}
          color="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* DRE GERENCIAL BLOCO */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200/60 overflow-hidden group">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> DRE Gerencial Consolidada
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-wider mt-1">
                  Distribuição de Despesas por Grupo DRE
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dreChartData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: "#64748b" }}
                    width={150}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(val) => BRL(val as number)}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {dreChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#0ea5e9", "#ef4444"][index % 6]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
               <div className="space-y-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Op. Líquida</p>
                 <p className="text-sm font-black text-slate-900">{BRL(agg?.resMes ?? 0)}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EBITDA Est.</p>
                 <p className="text-sm font-black text-slate-900">{BRL((agg?.resMes ?? 0) * 1.15)}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impostos</p>
                 <p className="text-sm font-black text-rose-600">{BRL(agg?.dreGroups.get("Despesas com Impostos") || 0)}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pessoal</p>
                 <p className="text-sm font-black text-slate-900">{BRL(agg?.dreGroups.get("Despesas com Pessoal") || 0)}</p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* ALERTAS GERENCIAIS */}
        <Card className="shadow-sm border-slate-200/60 overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-4">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas Gerenciais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {agg?.vencido && agg.vencido > 0 && (
                <div className="p-4 flex gap-3 hover:bg-slate-50 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Inadimplência Elevada</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Existem {BRL(agg.vencido)} em cobranças vencidas aguardando ação.</p>
                  </div>
                </div>
              )}
              {agg?.margemMes && agg.margemMes < 0.2 && (
                <div className="p-4 flex gap-3 hover:bg-slate-50 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Margem sob Pressão</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">A margem operacional do mês está em {PCT(agg.margemMes)}, abaixo da meta de 25%.</p>
                  </div>
                </div>
              )}
              <div className="p-4 flex gap-3 hover:bg-slate-50 transition-colors">
                <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Conversão Saudável</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Taxa de conversão comercial está acima da média histórica do grupo.</p>
                </div>
              </div>
              <div className="p-4 flex gap-3 hover:bg-slate-50 transition-colors">
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Pipeline Comercial</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Volume de propostas enviadas este mês garante o faturamento do próximo trimestre.</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
               <Button variant="link" className="p-0 h-auto text-[10px] uppercase font-black tracking-widest text-primary hover:no-underline">
                 Ver todos os diagnósticos <ChevronRight className="h-3 w-3 ml-1" />
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm border-slate-200/60 group hover:border-primary/20 transition-all cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Comercial</p>
                <p className="text-sm font-black text-slate-900">{comm?.aceitas} Fechamentos</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-slate-200/60 group hover:border-primary/20 transition-all cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                <Briefcase className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Operação</p>
                <p className="text-sm font-black text-slate-900">14 Em andamento</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200/60 group hover:border-primary/20 transition-all cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-violet-50 rounded-xl group-hover:bg-violet-100 transition-colors">
                <Building2 className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unidades</p>
                <p className="text-sm font-black text-slate-900">5 Negócios Ativos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200/60 group hover:border-primary/20 transition-all cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-slate-900 rounded-xl group-hover:bg-black transition-colors">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Metas 2026</p>
                <p className="text-sm font-black text-slate-900">68% Concluído</p>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/gestao")({
  component: Gestao,
});