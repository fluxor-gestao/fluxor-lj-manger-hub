import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
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
  AlertOctagon,
  Upload,
  FileUp,
  Loader2,
  CheckCircle2,
  Languages,
  Hash,
  Tag,
  Layers,
  Trash2,
  Workflow,
  PlusCircle,
  X,
  CreditCard,
  Banknote,
  Briefcase,
} from "lucide-react";
import { SmartFlowAnalysis, type FlowTransaction } from "@/components/financeiro/SmartFlowAnalysis";
import { toast } from "sonner";
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

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFinanceiroCatalogs } from "@/hooks/useFinanceiroCatalogs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/financeiro/rapport")({
  component: RapportPage,
});

// ============================================================
// i18n
// ============================================================
type Lang = "pt" | "en" | "es" | "fr";

const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: "pt", label: "Português", flag: "🇧🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
];

const T: Record<Lang, Record<string, string>> = {
  pt: {
    title: "Rapport Inteligente",
    subtitle: "Análise avançada e correlação de múltiplos extratos",
    back: "Voltar",
    config: "Configuração do Rapport",
    configDesc: "Selecione cliente e importe os extratos das contas (Corrente, COB, Operacional)",
    client: "Cliente",
    selectClient: "Selecione o cliente",
    month: "Mês de referência",
    language: "Idioma do relatório",
    upload: "Importar Conta",
    processAll: "Correlacionar Fluxos",
    processing: "Analisando padrões…",
    processed: "Extratos correlacionados",
    generate: "Gerar Rapport Final",
    summary: "Resumo do Fluxo",
    transactions: "Movimentações Consolidadas",
    flowTitle: "Visualização do Fluxo Financeiro",
    flowDesc: "Identificação automática de repasses, transferências e aplicações",
  },
  en: {
    title: "Smart Rapport",
    subtitle: "Advanced analysis and multi-statement correlation",
    back: "Back",
    config: "Rapport Setup",
    configDesc: "Select client and import statements (Checking, Billing, Operational)",
    client: "Client",
    selectClient: "Select client",
    month: "Reference Month",
    language: "Report Language",
    upload: "Import Account",
    processAll: "Correlate Flows",
    processing: "Analyzing patterns…",
    processed: "Statements correlated",
    generate: "Generate Final Rapport",
    summary: "Flow Summary",
    transactions: "Consolidated Transactions",
    flowTitle: "Financial Flow Visualization",
    flowDesc: "Automatic identification of transfers, payouts, and investments",
  },
  es: {
    title: "Rapport Inteligente",
    subtitle: "Análisis avanzado y correlación de múltiples extractos",
    back: "Volver",
    config: "Configuración",
    configDesc: "Seleccione cliente e importe extractos (Corriente, Cobro, Operacional)",
    client: "Cliente",
    selectClient: "Seleccione cliente",
    month: "Mes",
    language: "Idioma",
    upload: "Importar Cuenta",
    processAll: "Correlacionar Flujos",
    processing: "Analizando patrones…",
    processed: "Extractos correlacionados",
    generate: "Generar Informe",
    summary: "Resumen del Flujo",
    transactions: "Movimientos Consolidados",
    flowTitle: "Visualización del Flujo",
    flowDesc: "Identificación automática de transferencias y aplicaciones",
  },
  fr: {
    title: "Rapport Intelligent",
    subtitle: "Analyse avancée et corrélation multi-comptes",
    back: "Retour",
    config: "Configuration",
    configDesc: "Sélectionnez le client et importez les relevés (Courant, Facturation, Opérationnel)",
    client: "Client",
    selectClient: "Sélectionner un client",
    month: "Mois",
    language: "Langue",
    upload: "Importer un Compte",
    processAll: "Corréler les Flux",
    processing: "Analyse des patterns…",
    processed: "Relevés corrélés",
    generate: "Générer le Rapport",
    summary: "Résumé du Flux",
    transactions: "Transactions Consolidées",
    flowTitle: "Visualisation du Flux Financier",
    flowDesc: "Identification automatique des transferts et placements",
  },
};

// ============================================================
// types & helpers
// ============================================================
type Transaction = {
  id: string;
  date: string;
  description: string;
  interpretedDescription: string;
  type: "entrada" | "saida";
  amount: number;
  suggestedCategory: string;
  categoryId?: string;
  confidence?: number;
  note?: string;
  accountName?: string;
};

const ACCOUNT_TYPES = [
  { id: "corrente", label: "Conta Corrente", icon: Wallet },
  { id: "cobrança", label: "Conta Cobrança (COB)", icon: Banknote },
  { id: "operacional", label: "Conta Operacional", icon: Briefcase },
  { id: "outros", label: "Outros Bancos", icon: CreditCard },
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const fmtCurrency = (n: number, lang: Lang) => {
  const locale = lang === "en" ? "en-US" : "pt-BR";
  const currency = lang === "en" ? "USD" : "BRL";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n || 0);
};

// ============================================================
// component
// ============================================================
export default function RapportPage() {
  const navigate = useNavigate();
  const cats = useFinanceiroCatalogs();
  const clients = cats.clients ?? [];

  const [clientId, setClientId] = useState<string>("");
  const [month, setMonth] = useState<string>(monthKey(new Date()));
  const [language, setLanguage] = useState<Lang>("pt");
  const [statements, setStatements] = useState<{ id: string; file: File | null; accountType: string; status: "idle" | "processing" | "ready"; transactions: Transaction[] }[]>([]);
  const [generated, setGenerated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const t = T[language];

  // -------- transactions consolidate --------
  const consolidatedTransactions = useMemo(() => {
    return statements.flatMap(s => s.transactions.map(tx => ({ ...tx, accountName: s.accountType })));
  }, [statements]);

  const flowTransactions = useMemo<FlowTransaction[]>(() => {
    return consolidatedTransactions.map(tx => ({
      id: tx.id,
      date: tx.date,
      description: tx.description,
      interpretedDescription: tx.interpretedDescription,
      amount: tx.amount,
      type: tx.type,
      accountName: tx.accountName || "N/A"
    }));
  }, [consolidatedTransactions]);

  const agg = useMemo(() => {
    const totalIn = consolidatedTransactions.filter(t => t.type === "entrada").reduce((acc, t) => acc + t.amount, 0);
    const totalOut = consolidatedTransactions.filter(t => t.type === "saida").reduce((acc, t) => acc + t.amount, 0);
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [consolidatedTransactions]);

  // -------- actions --------
  const addStatementSlot = () => {
    setStatements(prev => [
      ...prev, 
      { id: crypto.randomUUID(), file: null, accountType: "Conta Corrente", status: "idle", transactions: [] }
    ]);
  };

  const removeStatementSlot = (id: string) => {
    setStatements(prev => prev.filter(s => s.id !== id));
  };

  const updateStatement = (id: string, patch: Partial<typeof statements[0]>) => {
    setStatements(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const handleProcessAll = async () => {
    if (!clientId) return toast.error(t.selectClient);
    if (statements.some(s => !s.file)) return toast.error("Por favor, carregue os arquivos de todas as contas.");

    setIsProcessing(true);
    setGenerated(false);

    // Mock processing multi-statements with correlated patterns
    setTimeout(async () => {
      const baseDate = `${month}-10`;
      const amount = 15000 + Math.random() * 5000;

      const processedStatements = await Promise.all(statements.map(async s => {
        let txs: Transaction[] = [];
        
        if (s.accountType.includes("Cobrança")) {
          txs = [
            { id: `in-${s.id}-1`, date: baseDate, description: "LIQUIDAÇÃO BOLETOS LOTE 442", interpretedDescription: "Recebimento de Boletos", type: "entrada", amount: amount, suggestedCategory: "Receita" },
            { id: `out-${s.id}-1`, date: baseDate, description: "TRANSFERENCIA PARA CONTA CORRENTE", interpretedDescription: "Transferência entre contas", type: "saida", amount: amount, suggestedCategory: "Transferência" },
          ];
        } else if (s.accountType.includes("Corrente")) {
          txs = [
            { id: `in-${s.id}-1`, date: baseDate, description: "PIX RECEBIDO - CONTA COBRANÇA", interpretedDescription: "Recebimento PIX", type: "entrada", amount: amount, suggestedCategory: "Transferência" },
            { id: `out-${s.id}-1`, date: `${month}-11`, description: "TED PARA CONTA OPERACIONAL", interpretedDescription: "Transferência TED", type: "saida", amount: amount - 2000, suggestedCategory: "Transferência" },
            { id: `out-${s.id}-2`, date: `${month}-12`, description: "APLICAÇÃO CDB LIQUIDEZ DIARIA", interpretedDescription: "Aplicação Financeira", type: "saida", amount: 2000, suggestedCategory: "Investimento" },
          ];
        } else if (s.accountType.includes("Operacional")) {
          txs = [
            { id: `in-${s.id}-1`, date: `${month}-11`, description: "TED RECEBIDA - MATRIZ", interpretedDescription: "Recebimento TED", type: "entrada", amount: amount - 2000, suggestedCategory: "Transferência" },
            { id: `out-${s.id}-1`, date: `${month}-15`, description: "PAGAMENTO FOLHA - MAIO", interpretedDescription: "Pagamento de Salários", type: "saida", amount: amount - 5000, suggestedCategory: "Pessoal" },
          ];
        } else {
          txs = [
            { id: `in-${s.id}-1`, date: `${month}-05`, description: "DEPOSITO IDENTIFICADO", interpretedDescription: "Depósito em Conta", type: "entrada", amount: 1000, suggestedCategory: "Outros" },
          ];
        }

        // Apply learned rules to each transaction
        const enrichedTxs = await Promise.all(txs.map(async tx => {
          const { data: rule } = await supabase
            .from("financial_classification_rules")
            .select("category_id, confidence_level")
            .eq("pattern", tx.description)
            .maybeSingle();

          if (rule) {
            const cat = cats.categories.find(c => c.id === rule.category_id);
            return {
              ...tx,
              categoryId: rule.category_id,
              suggestedCategory: cat?.name || tx.suggestedCategory,
              confidence: rule.confidence_level || undefined
            };
          }
          return tx;
        }));

        return { ...s, status: "ready" as const, transactions: enrichedTxs as Transaction[] };
      }));

      setStatements(processedStatements as any);
      setIsProcessing(false);
      setGenerated(true);
      toast.success(t.processed);
    }, 2000);
  };

  const handleUpdateClassification = async (tx: Transaction, newCategoryId: string) => {
    try {
      // 1. Update local state
      setStatements(prev => prev.map(s => ({
        ...s,
        transactions: s.transactions.map(t => t.id === tx.id ? { ...t, categoryId: newCategoryId, suggestedCategory: cats.categories.find(c => c.id === newCategoryId)?.name || t.suggestedCategory, confidence: 1 } : t) as any
      })));

      // 2. Persist to learning table
      const { data: existing } = await (supabase
        .from("financial_classification_rules")
        .select("id, occurrence_count") as any)
        .eq("pattern", tx.description)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("financial_classification_rules")
          .update({
            category_id: newCategoryId,
            occurrence_count: (existing.occurrence_count || 1) + 1,
            confidence_level: Math.min(0.95, ((existing.occurrence_count || 1) * 0.1) + 0.5),
            last_used_at: new Date().toISOString()
          } as any)
          .eq("id", existing.id);
      } else {
        await supabase
          .from("financial_classification_rules")
          .insert({
            pattern: tx.description,
            category_id: newCategoryId,
            client_id: clientId || null,
            occurrence_count: 1,
            confidence_level: 0.6
          } as any);
      }

      toast.success("Aprendizado atualizado!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar classificação.");
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/financeiro" })}>
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
           {generated && (
             <Button variant="outline" size="sm" onClick={() => toast.info("Exportando...")}>
               <FileText className="h-4 w-4 mr-2" /> PDF
             </Button>
           )}
        </div>
      </div>

      {/* Configuração */}
      <Card className="border-primary/10 shadow-md">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" /> {t.config}
          </CardTitle>
          <CardDescription>{t.configDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t.client}</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-background"><SelectValue placeholder={t.selectClient} /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t.month}</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5" /> {t.language}
              </Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as Lang)}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANG_OPTIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      <span className="mr-2">{l.flag}</span>{l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-primary/5" />

          {/* Statement Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Contas e Extratos
              </Label>
              <Button variant="outline" size="sm" onClick={addStatementSlot} className="h-8 border-primary/20 text-primary hover:bg-primary/5">
                <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Adicionar Conta
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {statements.map((s) => (
                <Card key={s.id} className={cn(
                  "relative border-2 border-dashed transition-all",
                  s.file ? "border-emerald-500/30 bg-emerald-500/5" : "border-muted-foreground/10 hover:border-primary/20"
                )}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeStatementSlot(s.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <CardContent className="p-4 space-y-3">
                    <Select value={s.accountType} onValueChange={(v) => updateStatement(s.id, { accountType: v })}>
                      <SelectTrigger className="h-7 text-xs bg-background border-none shadow-none font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map(at => (
                          <SelectItem key={at.id} value={at.label} className="text-xs">
                             <div className="flex items-center gap-2"><at.icon className="h-3 w-3" /> {at.label}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div 
                      className="flex flex-col items-center justify-center py-4 cursor-pointer"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.csv,.xls,.xlsx';
                        input.onchange = (e) => {
                          const f = (e.target as HTMLInputElement).files?.[0];
                          if (f) updateStatement(s.id, { file: f });
                        };
                        input.click();
                      }}
                    >
                      {s.file ? (
                        <>
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                          <p className="text-xs font-bold text-emerald-700 truncate max-w-[150px]">{s.file.name}</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground/30 mb-2" />
                          <p className="text-[10px] text-muted-foreground text-center uppercase tracking-tight">Upload Extrato</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {statements.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground/40 text-sm border-2 border-dashed rounded-xl border-muted-foreground/10 bg-muted/5">
                  Nenhuma conta adicionada para análise.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              size="lg" 
              onClick={handleProcessAll} 
              disabled={isProcessing || statements.length === 0}
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-8"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
              {isProcessing ? t.processing : t.processAll}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {generated && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
          
          {/* Dashboard KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
             <Card className="bg-emerald-50 border-emerald-100">
               <CardContent className="p-6 flex flex-row items-center justify-between">
                 <div>
                   <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Entradas Totais</p>
                   <p className="text-2xl font-black text-emerald-700">{fmtCurrency(agg.totalIn, language)}</p>
                 </div>
                 <ArrowUpRight className="h-8 w-8 text-emerald-500 opacity-20" />
               </CardContent>
             </Card>
             <Card className="bg-blue-50 border-blue-100">
               <CardContent className="p-6 flex flex-row items-center justify-between">
                 <div>
                   <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">Saídas Totais</p>
                   <p className="text-2xl font-black text-blue-700">{fmtCurrency(agg.totalOut, language)}</p>
                 </div>
                 <ArrowDownRight className="h-8 w-8 text-blue-500 opacity-20" />
               </CardContent>
             </Card>
             <Card className={cn(agg.net >= 0 ? "bg-primary/5 border-primary/10" : "bg-rose-50 border-rose-100")}>
               <CardContent className="p-6 flex flex-row items-center justify-between">
                 <div>
                   <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", agg.net >= 0 ? "text-primary" : "text-rose-600")}>Saldo Líquido</p>
                   <p className={cn("text-2xl font-black", agg.net >= 0 ? "text-primary" : "text-rose-700")}>{fmtCurrency(agg.net, language)}</p>
                 </div>
                 <Wallet className="h-8 w-8 opacity-20" />
               </CardContent>
             </Card>
          </div>

          {/* Smart Flow Analysis Section */}
          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Workflow className="h-5 w-5 text-primary" /> {t.flowTitle}
              </h2>
              <p className="text-sm text-muted-foreground">{t.flowDesc}</p>
            </div>
            <SmartFlowAnalysis transactions={flowTransactions} language={language} />
          </section>

          {/* Transactions Table */}
          <section className="space-y-4">
             <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold flex items-center gap-2">
                 <FileText className="h-5 w-5 text-primary" /> {t.transactions}
               </h2>
               <Badge variant="outline" className="h-6">{consolidatedTransactions.length} Lançamentos</Badge>
             </div>
             <Card className="overflow-hidden border-primary/5">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-bold">Conta</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Data</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Descrição Original</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Descrição Interpretada</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-right">Valor</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold">Categoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidatedTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-xs italic">
                          Aguardando processamento dos extratos...
                        </TableCell>
                      </TableRow>
                    )}
                    {consolidatedTransactions.map(tx => (
                      <TableRow key={tx.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell>
                          <Badge variant="secondary" className="text-[9px] font-mono uppercase bg-background border">
                            {tx.accountName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{new Date(tx.date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground italic" title={tx.description}>{tx.description}</TableCell>
                        <TableCell className="text-xs font-bold text-primary">{tx.interpretedDescription}</TableCell>
                        <TableCell className={cn("text-xs font-black text-right", tx.type === "entrada" ? "text-emerald-600" : "text-rose-600")}>
                          {tx.type === "entrada" ? "+" : "−"} {fmtCurrency(tx.amount, language)}
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                             <Select 
                               value={tx.categoryId || ""} 
                               onValueChange={(v) => handleUpdateClassification(tx, v)}
                             >
                               <SelectTrigger className="h-7 text-[10px] uppercase font-bold border-none shadow-none bg-muted/20 hover:bg-muted/40 transition-colors w-auto">
                                 <SelectValue placeholder={tx.suggestedCategory} />
                               </SelectTrigger>
                               <SelectContent>
                                 {cats.categories.map(cat => (
                                   <SelectItem key={cat.id} value={cat.id} className="text-[10px] uppercase">{cat.name}</SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                             {tx.confidence && tx.confidence > 0 && tx.confidence < 1 && (
                               <Badge variant="outline" className={cn(
                                 "text-[8px] h-4 px-1",
                                 tx.confidence > 0.8 ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-amber-600 border-amber-200 bg-amber-50"
                               )}>
                                 {(tx.confidence * 100).toFixed(0)}% confiança
                               </Badge>
                             )}
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </Card>
          </section>

        </div>
      )}
      
      {!generated && !isProcessing && (
        <div className="py-24 text-center space-y-4 border-2 border-dashed rounded-3xl bg-muted/5 border-muted-foreground/10">
          <div className="bg-background rounded-full p-6 inline-flex shadow-xl shadow-primary/5 ring-1 ring-primary/10">
            <Workflow className="h-12 w-12 text-primary/20 animate-pulse" />
          </div>
          <div className="space-y-2 max-w-sm mx-auto">
            <h3 className="font-bold text-lg">Pronto para começar?</h3>
            <p className="text-sm text-muted-foreground">Importe os extratos bancários das contas que deseja analisar e deixe nossa IA identificar as correlações de fluxo.</p>
          </div>
        </div>
      )}
    </div>
  );
}
