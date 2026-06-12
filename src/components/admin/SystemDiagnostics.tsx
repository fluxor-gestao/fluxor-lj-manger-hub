import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, ShieldAlert, Loader2, Database, Link as LinkIcon, Layers, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDevisCode } from "@/lib/formatDevis";

type DiagnosticResult = {
  id: string;
  category: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  details?: any;
};

export function SystemDiagnostics() {
  const { data: diagnostics = [], isLoading } = useQuery({
    queryKey: ["system-diagnostics-orphans"],
    queryFn: async () => {
      const results: DiagnosticResult[] = [];

      // 1. bank_statement_entries pendentes de lotes problemáticos
      const { data: bse } = await supabase
        .from("bank_statement_entries")
        .select(`
          id, description, transaction_date, 
          import_batches!inner(status, file_name)
        `)
        .eq("conciliation_status", "pendente")
        .in("import_batches.status", ["erro", "parcial" as any]);

      if (bse && bse.length > 0) {
        results.push({
          id: "bse-orphans",
          category: "Conciliação",
          severity: "medium",
          title: "Entradas Bancárias Pendentes de Lotes com Erro",
          description: `Identificadas ${bse.length} entradas em lotes não concluídos.`,
          details: bse.map((b: any) => ({
            label: b.description,
            sub: `${b.import_batches.file_name} (${b.import_batches.status})`
          }))
        });
      }

      // 2. conciliation_matches sem financial_entry válido
      const { data: matches } = await supabase
        .from("conciliation_matches")
        .select("id, bank_statement_entry_id, financial_entry_id");
      
      // Como o Supabase não suporta anti-joins nativos via query builder de forma simples, 
      // verificamos órfãos manualmente para precisão máxima ou via RPC se necessário.
      // Aqui simulamos a lógica mapeando IDs.
      const { data: entries } = await supabase.from("financial_entries").select("id");
      const validEntryIds = new Set(entries?.map(e => e.id) || []);
      const orphanMatches = matches?.filter(m => !validEntryIds.has(m.financial_entry_id)) || [];

      if (orphanMatches.length > 0) {
        results.push({
          id: "match-orphans",
          category: "Conciliação",
          severity: "high",
          title: "Vínculos de Conciliação Órfãos",
          description: `Existem ${orphanMatches.length} matches apontando para lançamentos financeiros inexistentes.`,
          details: orphanMatches.map(m => ({ label: `Match ID: ${m.id.slice(0, 8)}`, sub: `Entry ID: ${m.financial_entry_id}` }))
        });
      }

      // 3. financial_entries sem source_type
      const { data: feNoSource } = await supabase
        .from("financial_entries")
        .select("id, movement_description, entry_date")
        .is("source_type", null);

      if (feNoSource && feNoSource.length > 0) {
        results.push({
          id: "fe-no-source",
          category: "Financeiro",
          severity: "low",
          title: "Lançamentos sem Origem Definida",
          description: `Identificados ${feNoSource.length} registros sem 'source_type'.`,
          details: feNoSource.map(f => ({ label: f.movement_description, sub: f.entry_date }))
        });
      }

      // 4. services duplicados para o mesmo devis_id
      const { data: serviceDupes } = await supabase.rpc("check_service_duplicates" as any);
      if (serviceDupes && serviceDupes.length > 0) {
        results.push({
          id: "service-dupes",
          category: "Operação",
          severity: "medium",
          title: "Processos Operacionais Duplicados",
          description: `Identificados ${serviceDupes.length} Devis com mais de um processo operacional vinculado.`,
          details: serviceDupes.map((d: any) => ({ label: `Devis ID: ${d.devis_id.slice(0, 8)}`, sub: `${d.count} processos` }))
        });
      }

      // 5. Devis aceitos sem cobrança inicial ou sem operação
      const { data: devisAceitos } = await supabase
        .from("devis")
        .select("id, devis_number, title, status, accepted_at, initial_charge_generated")
        .or("status.eq.aceita,accepted_at.not.is.null");

      if (devisAceitos) {
        const noCharge = devisAceitos.filter(d => !d.initial_charge_generated);
        if (noCharge.length > 0) {
          results.push({
            id: "devis-no-charge",
            category: "Comercial",
            severity: "medium",
            title: "Devis Aceitos sem Cobrança Inicial",
            description: `Identificadas ${noCharge.length} propostas aceitas que não geraram cobrança automática.`,
            details: noCharge.map(d => ({ label: d.devis_number || "Sem código", sub: d.title }))
          });
        }

        // Verificando operação órfã (via services)
        const { data: srvs } = await supabase.from("services").select("devis_id");
        const devisWithService = new Set(srvs?.map(s => s.devis_id).filter(Boolean) || []);
        const noService = devisAceitos.filter(d => !devisWithService.has(d.id));

        if (noService.length > 0) {
          results.push({
            id: "devis-no-service",
            category: "Operação",
            severity: "medium",
            title: "Devis Aceitos sem Processo Operacional",
            description: `Identificadas ${noService.length} propostas aceitas sem case na Operação.`,
            details: noService.map(d => ({ label: d.devis_number || "Sem código", sub: d.title }))
          });
        }

        // 7. Status inconsistente
        const badStatus = devisAceitos.filter(d => d.accepted_at && d.status !== 'aceita');
        if (badStatus.length > 0) {
          results.push({
            id: "devis-bad-status",
            category: "Comercial",
            severity: "low",
            title: "Devis com Aceite mas Status Incorreto",
            description: `Existem ${badStatus.length} registros com 'accepted_at' preenchido mas status diferente de 'aceita'.`,
            details: badStatus.map(d => ({ label: d.devis_number || d.id.slice(0, 8), sub: `Status: ${d.status}` }))
          });
        }
      }

      return results;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-3 opacity-20" />
        Executando diagnóstico de integridade...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {diagnostics.length === 0 ? (
          <Card className="col-span-full border-emerald-500/20 bg-emerald-50/10">
            <CardContent className="pt-6 flex flex-col items-center text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h3 className="text-lg font-bold text-emerald-700">Integridade Validada</h3>
              <p className="text-sm text-emerald-600/80">Nenhuma inconsistência ou registro órfão identificado na estrutura atual.</p>
            </CardContent>
          </Card>
        ) : (
          diagnostics.map((diag) => (
            <Card key={diag.id} className={cn(
              "overflow-hidden border-l-4",
              diag.severity === "high" ? "border-l-rose-500" : 
              diag.severity === "medium" ? "border-l-amber-500" : "border-l-blue-500"
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{diag.category}</Badge>
                  {diag.severity === "high" ? <ShieldAlert className="h-4 w-4 text-rose-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                </div>
                <CardTitle className="text-sm font-black mt-2">{diag.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{diag.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                  {diag.details?.map((item: any, i: number) => (
                    <div key={i} className="text-[11px] p-2 rounded bg-muted/50 border border-border/50">
                      <p className="font-bold text-slate-700">{item.label}</p>
                      <p className="text-slate-500">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
