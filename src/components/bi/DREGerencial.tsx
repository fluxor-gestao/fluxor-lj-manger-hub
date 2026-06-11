import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Download, Filter, FileText, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";

const BRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const PCT = (n: number) => `${(n * 100).toFixed(1)}%`;

export function DREGerencial() {
  const { filterCode: companyCode } = useCompany();
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: "all",
    start: "",
    end: "",
    bu: "all",
    area: "all",
    costCenter: "all",
  });

  // Always fetch the whole year to calculate "Acumulado no Ano"
  const { data: allYearEntries, isLoading } = useQuery({
    queryKey: ["dre-gerencial-year-entries", filters.year, filters.bu, filters.area, filters.costCenter, companyCode],
    queryFn: async () => {
      let qb = supabase
        .from("financial_entries")
        .select("*")
        .neq("entry_type", "transferencia")
        .gte("entry_date", `${filters.year}-01-01`)
        .lte("entry_date", `${filters.year}-12-31`);

      const effectiveBu = companyCode || (filters.bu !== "all" ? filters.bu : null);
      if (effectiveBu) qb = qb.eq("business_unit", effectiveBu);
      if (filters.area !== "all") qb = qb.eq("area_slug", filters.area);
      if (filters.costCenter !== "all") qb = qb.eq("cost_center_id", filters.costCenter);

      const { data, error } = await qb;
      if (error) throw error;
      return data || [];
    }
  });

  const { data: businessUnits } = useQuery({
    queryKey: ["bus"],
    queryFn: async () => {
      const { data } = await supabase.from("business_units").select("code, name");
      return data || [];
    }
  });

  const { data: costCenters } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => {
      const { data } = await supabase.from("cost_centers").select("id, name");
      return data || [];
    }
  });

  const analytics = useMemo(() => {
    if (!allYearEntries) return null;

    const filtered = allYearEntries.filter(e => {
      if (filters.start || filters.end) {
        if (filters.start && e.entry_date < filters.start) return false;
        if (filters.end && e.entry_date > filters.end) return false;
        return true;
      }
      if (filters.month !== "all") {
        const m = filters.month.padStart(2, "0");
        return e.entry_date.startsWith(`${filters.year}-${m}`);
      }
      return true;
    });

    const calculateDRE = (rows: any[]) => {
      const res: any = {
        receitaBruta: 0,
        impostos: 0,
        pessoal: 0,
        encargos: 0,
        administrativo: 0,
        financeiro: 0,
        diretoria: 0,
        investimentos: 0,
        unclassified: 0,
        countUnclassified: 0,
      };

      for (const e of rows) {
        const val = Number(e.paid_amount || 0);
        const group = e.dre_group;

        if (e.entry_type === "receita") {
          res.receitaBruta += val;
        } else if (e.entry_type === "despesa") {
          if (!group) {
            res.unclassified += val;
            res.countUnclassified++;
          } else {
            if (group === "Despesas com Impostos") res.impostos += val;
            else if (group === "Despesas com Pessoal") res.pessoal += val;
            else if (group === "Encargos Sociais") res.encargos += val;
            else if (group === "Despesas Administrativas") res.administrativo += val;
            else if (group === "Despesas Financeiras") res.financeiro += val;
            else if (group === "Diretoria") res.diretoria += val;
            else if (group === "Investimentos no Patrimônio") res.investimentos += val;
          }
        }
      }
      res.receitaLiquida = res.receitaBruta - res.impostos;
      res.resultadoOperacional = res.receitaLiquida - (
        res.pessoal + res.encargos + res.administrativo + res.financeiro + res.diretoria + res.investimentos
      );
      return res;
    };

    const currentDRE = calculateDRE(filtered);
    const yearDRE = calculateDRE(allYearEntries);

    // Margins and weights for current view
    currentDRE.margemOp = currentDRE.receitaBruta > 0 ? currentDRE.resultadoOperacional / currentDRE.receitaBruta : 0;
    currentDRE.pesoFolha = currentDRE.receitaBruta > 0 ? (currentDRE.pessoal + currentDRE.encargos) / currentDRE.receitaBruta : 0;
    currentDRE.pesoImpostos = currentDRE.receitaBruta > 0 ? currentDRE.impostos / currentDRE.receitaBruta : 0;
    currentDRE.pesoAdm = currentDRE.receitaBruta > 0 ? currentDRE.administrativo / currentDRE.receitaBruta : 0;
    
    currentDRE.acumuladoAno = yearDRE.resultadoOperacional;

    return currentDRE;
  }, [allYearEntries, filters]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculando DRE Gerencial...</p>
    </div>
  );

  const dre = analytics;

  return (
    <div className="space-y-6">
      {/* FILTROS */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Ano</Label>
              <Select value={filters.year} onValueChange={(v) => setFilters(f => ({ ...f, year: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Mês</Label>
              <Select value={filters.month} onValueChange={(v) => setFilters(f => ({ ...f, month: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">Janeiro</SelectItem>
                  <SelectItem value="2">Fevereiro</SelectItem>
                  <SelectItem value="3">Março</SelectItem>
                  <SelectItem value="4">Abril</SelectItem>
                  <SelectItem value="5">Maio</SelectItem>
                  <SelectItem value="6">Junho</SelectItem>
                  <SelectItem value="7">Julho</SelectItem>
                  <SelectItem value="8">Agosto</SelectItem>
                  <SelectItem value="9">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Unidade</Label>
              <Select value={filters.bu} onValueChange={(v) => setFilters(f => ({ ...f, bu: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {businessUnits?.map(bu => (
                    <SelectItem key={bu.code} value={bu.code || "unknown"}>{bu.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Centro de Custo</Label>
              <Select value={filters.costCenter} onValueChange={(v) => setFilters(f => ({ ...f, costCenter: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Centro de Custo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {costCenters?.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Serviço/Área</Label>
              <Select value={filters.area} onValueChange={(v) => setFilters(f => ({ ...f, area: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="operacao">Operação</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Início</Label>
              <Input 
                type="date" 
                className="h-9 text-xs" 
                value={filters.start} 
                onChange={(e) => setFilters(f => ({ ...f, start: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Fim</Label>
              <Input 
                type="date" 
                className="h-9 text-xs" 
                value={filters.end} 
                onChange={(e) => setFilters(f => ({ ...f, end: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ALERTAS */}
      {dre && dre.countUnclassified > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4 animate-in slide-in-from-top-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-900">Atenção: Despesas sem classificação DRE</h4>
            <p className="text-xs text-amber-700">
              Existem {dre.countUnclassified} lançamentos totalizando {BRL(dre.unclassified)} que não foram classificados no Plano de Contas Gerencial. Isso pode afetar a precisão da sua DRE.
            </p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto border-amber-200 text-amber-700 hover:bg-amber-100 h-8 text-xs font-bold">
            Ver Lançamentos
          </Button>
        </div>
      )}

      {/* DRE TABLE */}
      <Card className="border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> DRE Gerencial
            </CardTitle>
            <CardDescription className="text-xs">Demonstrativo de Resultados do Exercício (Visão Financeira Realizada)</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-2">
            <Download className="h-3.5 w-3.5" /> Exportar PDF
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
                <TableHead className="w-[400px] font-bold text-slate-600 uppercase text-[10px] tracking-wider">Descrição das Contas</TableHead>
                <TableHead className="text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider">Valor (R$)</TableHead>
                <TableHead className="text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider">% Rec. Bruta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* RECEITA BRUTA */}
              <TableRow className="font-black bg-emerald-50/30 hover:bg-emerald-50/40">
                <TableCell>RECEITA BRUTA</TableCell>
                <TableCell className="text-right">{BRL(dre?.receitaBruta)}</TableCell>
                <TableCell className="text-right">100.0%</TableCell>
              </TableRow>
              
              <TableRow className="text-slate-500 italic">
                <TableCell className="pl-8">(-) Impostos sobre Vendas</TableCell>
                <TableCell className="text-right text-rose-600">{BRL(dre?.impostos)}</TableCell>
                <TableCell className="text-right">{PCT(dre?.pesoImpostos || 0)}</TableCell>
              </TableRow>

              <TableRow className="font-bold border-t-2 border-slate-100">
                <TableCell>RECEITA LÍQUIDA</TableCell>
                <TableCell className="text-right">{BRL(dre?.receitaLiquida)}</TableCell>
                <TableCell className="text-right">{PCT(dre && dre.receitaBruta > 0 ? dre.receitaLiquida / dre.receitaBruta : 0)}</TableCell>
              </TableRow>

              <TableRow className="h-4 bg-slate-50/10"><TableCell colSpan={3}></TableCell></TableRow>

              {/* DESPESAS */}
              <TableRow>
                <TableCell className="pl-8 text-slate-600">(-) Despesas com Pessoal</TableCell>
                <TableCell className="text-right text-rose-600">{BRL(dre?.pessoal)}</TableCell>
                <TableCell className="text-right">{PCT(dre && dre.receitaBruta > 0 ? dre.pessoal / dre.receitaBruta : 0)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-8 text-slate-600">(-) Encargos Sociais</TableCell>
                <TableCell className="text-right text-rose-600">{BRL(dre?.encargos)}</TableCell>
                <TableCell className="text-right">{PCT(dre && dre.receitaBruta > 0 ? dre.encargos / dre.receitaBruta : 0)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-8 text-slate-600">(-) Despesas Administrativas</TableCell>
                <TableCell className="text-right text-rose-600">{BRL(dre?.administrativo)}</TableCell>
                <TableCell className="text-right">{PCT(dre?.pesoAdm || 0)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-8 text-slate-600">(-) Despesas Financeiras</TableCell>
                <TableCell className="text-right text-rose-600">{BRL(dre?.financeiro)}</TableCell>
                <TableCell className="text-right">{PCT(dre && dre.receitaBruta > 0 ? dre.financeiro / dre.receitaBruta : 0)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-8 text-slate-600">(-) Diretoria</TableCell>
                <TableCell className="text-right text-rose-600">{BRL(dre?.diretoria)}</TableCell>
                <TableCell className="text-right">{PCT(dre && dre.receitaBruta > 0 ? dre.diretoria / dre.receitaBruta : 0)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-8 text-slate-600">(-) Investimentos</TableCell>
                <TableCell className="text-right text-rose-600">{BRL(dre?.investimentos)}</TableCell>
                <TableCell className="text-right">{PCT(dre && dre.receitaBruta > 0 ? dre.investimentos / dre.receitaBruta : 0)}</TableCell>
              </TableRow>

              <TableRow className="h-4 bg-slate-50/10"><TableCell colSpan={3}></TableCell></TableRow>

              {/* RESULTADO OPERACIONAL */}
              <TableRow className={cn("font-black text-white", (dre?.resultadoOperacional || 0) >= 0 ? "bg-emerald-600" : "bg-rose-600")}>
                <TableCell>RESULTADO OPERACIONAL</TableCell>
                <TableCell className="text-right">{BRL(dre?.resultadoOperacional)}</TableCell>
                <TableCell className="text-right">{PCT(dre?.margemOp || 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* INDICADORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Margem Operacional</p>
            <div className="flex items-end justify-between">
              <h4 className="text-2xl font-black text-slate-900">{PCT(dre?.margemOp || 0)}</h4>
              <Badge className={cn("text-[10px] h-5", (dre?.margemOp || 0) >= 0.2 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100")}>
                {(dre?.margemOp || 0) >= 0.2 ? "Saudável" : "Atenção"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Peso da Folha / Rec.</p>
            <div className="flex items-end justify-between">
              <h4 className="text-2xl font-black text-slate-900">{PCT(dre?.pesoFolha || 0)}</h4>
              <p className="text-[10px] text-slate-500 font-medium">Meta: máx 40%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resultado Acumulado Ano</p>
            <h4 className={cn("text-2xl font-black", (dre?.acumuladoAno || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {BRL(dre?.acumuladoAno)}
            </h4>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Peso Impostos / Rec.</p>
            <h4 className="text-2xl font-black text-slate-900">{PCT(dre?.pesoImpostos || 0)}</h4>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

