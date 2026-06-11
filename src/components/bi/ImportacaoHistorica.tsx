import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, Loader2, 
  History, Download, Search, Database, ArrowRight, X,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

const BRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

interface ImportPreview {
  type: "indicators" | "expenses";
  fileName: string;
  data: any[];
}

export function ImportacaoHistorica() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMode, setImportMode] = useState<"indicators" | "expenses" | null>(null);

  const { data: importLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ["import-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_logs")
        .select(`
          *,
          profiles (full_name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "indicators" | "expenses") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error("O arquivo está vazio.");
          return;
        }

        // Basic validation of columns based on type
        const firstRow = data[0] as any;
        if (type === "indicators") {
          if (!firstRow.Ano || !firstRow.Mês || !firstRow.Receita) {
            toast.error("Colunas obrigatórias não encontradas: Ano, Mês, Receita");
            return;
          }
        } else {
          if (!firstRow.Ano || !firstRow.Mês || !firstRow.Grupo || !firstRow.Subconta || !firstRow.Valor) {
            toast.error("Colunas obrigatórias não encontradas: Ano, Mês, Grupo, Subconta, Valor");
            return;
          }
        }

        setPreview({ type, fileName: file.name, data });
        setImportMode(type);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao ler o arquivo. Certifique-se de que é um Excel ou CSV válido.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const importMutation = useMutation({
    mutationFn: async ({ strategy }: { strategy: "update" | "ignore" }) => {
      if (!preview) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Create Log
      const { data: log, error: logErr } = await supabase
        .from("import_logs")
        .insert({
          user_id: user.id,
          file_name: preview.fileName,
          import_type: preview.type,
          record_count: preview.data.length,
          status: "pending"
        })
        .select()
        .single();

      if (logErr) throw logErr;

      try {
        if (preview.type === "indicators") {
          for (const row of preview.data) {
            const payload = {
              year: parseInt(row.Ano),
              month: parseInt(row.Mês),
              service_name: row.Serviço || "Geral",
              revenue_amount: parseFloat(row.Receita || 0),
              business_unit: row.Unidade || null,
              import_log_id: log.id
            };

            if (strategy === "update") {
              const { error } = await supabase
                .from("historical_indicators")
                .upsert(payload, { onConflict: "year,month,service_name,business_unit" });
              if (error) throw error;
            } else {
              const { error } = await supabase
                .from("historical_indicators")
                .insert(payload);
              // Ignore unique constraint errors if strategy is 'ignore'
              if (error && error.code !== "23505") throw error;
            }
          }
        } else {
          for (const row of preview.data) {
            const payload = {
              year: parseInt(row.Ano),
              month: parseInt(row.Mês),
              dre_group: row.Grupo,
              account_name: row.Subconta,
              expense_amount: parseFloat(row.Valor || 0),
              business_unit: row.Unidade || null,
              import_log_id: log.id
            };

            if (strategy === "update") {
              const { error } = await supabase
                .from("historical_expenses")
                .upsert(payload, { onConflict: "year,month,dre_group,account_name,business_unit" });
              if (error) throw error;
            } else {
              const { error } = await supabase
                .from("historical_expenses")
                .insert(payload);
              if (error && error.code !== "23505") throw error;
            }
          }
        }

        await supabase
          .from("import_logs")
          .update({ status: "completed" })
          .eq("id", log.id);

      } catch (err: any) {
        await supabase
          .from("import_logs")
          .update({ status: "error", error_log: err.message })
          .eq("id", log.id);
        throw err;
      }
    },
    onSuccess: () => {
      toast.success("Importação concluída com sucesso!");
      setPreview(null);
      setImportMode(null);
      queryClient.invalidateQueries({ queryKey: ["import-logs"] });
    },
    onError: (err: any) => {
      toast.error(`Erro na importação: ${err.message}`);
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARDS DE IMPORTAÇÃO */}
        <Card className="border-slate-200/60 shadow-sm hover:border-primary/20 transition-all">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Indicadores 3 Anos LJ
            </CardTitle>
            <CardDescription className="text-xs">Importar histórico de receitas mensais por serviço.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50 group hover:bg-slate-50 hover:border-primary/30 transition-all cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={(e) => handleFileUpload(e, "indicators")}
                  disabled={isProcessing}
                />
                <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-slate-400" />}
                </div>
                <p className="text-xs font-bold text-slate-900">Clique ou arraste o arquivo</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Ano, Mês, Receita, Serviço, Unidade</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 shadow-sm hover:border-primary/20 transition-all">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" /> Controle de Despesas OK
            </CardTitle>
            <CardDescription className="text-xs">Importar histórico de despesas detalhadas por subconta.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50 group hover:bg-slate-50 hover:border-primary/30 transition-all cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={(e) => handleFileUpload(e, "expenses")}
                  disabled={isProcessing}
                />
                <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-slate-400" />}
                </div>
                <p className="text-xs font-bold text-slate-900">Clique ou arraste o arquivo</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Ano, Mês, Grupo, Subconta, Valor, Unidade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PREVIEW */}
      {preview && (
        <Card className="border-primary/20 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-black">Preview: {preview.fileName}</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-wider">
                  {preview.data.length} registros encontrados
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setPreview(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.data[0] && Object.keys(preview.data[0]).map(key => (
                      <TableHead key={key} className="text-[10px] font-bold uppercase">{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.data.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val: any, j) => (
                        <TableCell key={j} className="text-xs font-medium">
                          {typeof val === 'number' && val > 100 ? BRL(val) : val}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {preview.data.length > 5 && (
                    <TableRow>
                      <TableCell colSpan={99} className="text-center py-4 bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          + {preview.data.length - 5} registros ocultos no preview
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-6 bg-slate-50/30 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-xs font-bold">Escolha como tratar registros existentes:</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="gap-2 font-bold text-xs h-10 px-6 border-slate-200"
                  onClick={() => importMutation.mutate({ strategy: "ignore" })}
                  disabled={importMutation.isPending}
                >
                  Pular Duplicados
                </Button>
                <Button 
                  className="gap-2 font-bold text-xs h-10 px-6 shadow-md"
                  onClick={() => importMutation.mutate({ strategy: "update" })}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Sobrescrever / Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HISTÓRICO DE IMPORTAÇÕES */}
      <Card className="border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/30 border-b border-slate-100">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" /> Log de Importações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/20 hover:bg-slate-50/20">
                <TableHead className="text-[10px] font-bold uppercase">Data</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Usuário</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Arquivo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Registros</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingLogs ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-200" /></TableCell></TableRow>
              ) : importLogs?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs italic font-medium">Nenhuma importação realizada ainda.</TableCell></TableRow>
              ) : importLogs?.map(log => (
                <TableRow key={log.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="text-xs font-medium text-slate-500">
                    {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-900">
                    {log.profiles?.full_name || "Sistema"}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {log.file_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] uppercase font-black py-0 h-4 border-slate-200">
                      {log.import_type === 'indicators' ? 'Indicadores' : 'Despesas'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-600">
                    {log.record_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      {log.status === 'completed' ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-[10px] font-black uppercase">Concluído</span>
                        </div>
                      ) : log.status === 'error' ? (
                        <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100" title={log.error_log || "Erro desconhecido"}>
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-[10px] font-black uppercase">Erro</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-[10px] font-black uppercase">Processando</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Add these Lucide icons to the top imports if they are missing
import { TrendingUp as TrendingUpIcon } from "lucide-react";
const TrendingUp = TrendingUpIcon;
