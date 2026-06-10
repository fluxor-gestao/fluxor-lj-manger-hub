import { useMemo } from "react";
import { 
  ArrowRight, 
  ArrowRightLeft, 
  CircleDollarSign, 
  CreditCard, 
  MoveRight, 
  TrendingUp, 
  Wallet,
  Info,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FlowTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "entrada" | "saida";
  accountName: string;
  accountType?: string;
};

export type FlowGroup = {
  id: string;
  title: string;
  steps: FlowTransaction[];
  totalValue: number;
  correlationType: "transferencia" | "sequencial" | "operacional";
};

interface Props {
  transactions: FlowTransaction[];
  language?: string;
}

export function SmartFlowAnalysis({ transactions, language = "pt" }: Props) {
  const flows = useMemo(() => {
    const result: FlowGroup[] = [];
    const usedIds = new Set<string>();

    // 1. Identify Internal Transfers (Account A out -> Account B in)
    const outflows = transactions.filter(t => t.type === "saida");
    const inflows = transactions.filter(t => t.type === "entrada");

    outflows.forEach(out => {
      if (usedIds.has(out.id)) return;

      const matchingIn = inflows.find(inc => 
        !usedIds.has(inc.id) &&
        Math.abs(inc.amount) === Math.abs(out.amount) &&
        inc.accountName !== out.accountName &&
        (inc.date === out.date || 
         Math.abs(new Date(inc.date).getTime() - new Date(out.date).getTime()) <= 86400000 * 2)
      );

      if (matchingIn) {
        usedIds.add(out.id);
        usedIds.add(matchingIn.id);
        result.push({
          id: `flow-transfer-${out.id}`,
          title: "Transferência Interna",
          correlationType: "transferencia",
          totalValue: out.amount,
          steps: [out, matchingIn]
        });
      }
    });

    // 2. Identify Sequential Flows (Receipt -> Transfer -> Investment/Expense)
    // For now, let's keep it simple: any high value receipt followed by a transfer of similar value
    inflows.forEach(inc => {
      if (usedIds.has(inc.id)) return;

      const followUp = result.find(f => 
        f.correlationType === "transferencia" &&
        f.steps[0].accountName === inc.accountName &&
        Math.abs(f.totalValue - inc.amount) < inc.amount * 0.05 && // within 5%
        new Date(f.steps[0].date) >= new Date(inc.date) &&
        Math.abs(new Date(f.steps[0].date).getTime() - new Date(inc.date).getTime()) <= 86400000 * 3
      );

      if (followUp) {
        usedIds.add(inc.id);
        followUp.steps.unshift(inc);
        followUp.title = "Fluxo de Recebimento e Repasse";
        followUp.correlationType = "sequencial";
      }
    });

    return result;
  }, [transactions]);

  if (flows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
        <Info className="h-10 w-10 mb-2 opacity-20" />
        <p className="text-sm">Nenhum fluxo correlacionado identificado automaticamente.</p>
        <p className="text-xs">O Rapport identifica movimentações entre contas corrente, cobrança e operacional.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {flows.map((flow) => (
        <Card key={flow.id} className="overflow-hidden border-primary/20 hover:border-primary/40 transition-all shadow-sm hover:shadow-md">
          <CardHeader className="bg-muted/30 py-3 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                {flow.correlationType === "transferencia" && <ArrowRightLeft className="h-4 w-4 text-blue-500" />}
                {flow.correlationType === "sequencial" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                {flow.title}
              </CardTitle>
              <CardDescription className="text-[10px] uppercase tracking-wider font-semibold">
                {flow.steps.length} estágios identificados
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-primary">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(flow.totalValue)}
              </p>
              <Badge variant="secondary" className="text-[10px] h-4">
                {flow.correlationType}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="py-6">
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-2">
              {flow.steps.map((step, idx) => (
                <div key={step.id} className="flex flex-1 items-center gap-3 w-full">
                  <div className="relative flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2",
                      step.type === "entrada" ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-blue-50 border-blue-200 text-blue-600"
                    )}>
                      {step.type === "entrada" ? <CircleDollarSign className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <span className="text-[10px] font-bold mt-1 text-muted-foreground">{idx + 1}º</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-bold truncate" title={step.description}>{step.description}</p>
                      <Badge variant="outline" className="text-[9px] px-1 h-4 font-mono truncate max-w-[100px]">
                        {step.accountName}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(step.date).toLocaleDateString("pt-BR")}
                      </p>
                      <p className={cn(
                        "text-xs font-black",
                        step.type === "entrada" ? "text-emerald-600" : "text-blue-600"
                      )}>
                        {step.type === "entrada" ? "+" : "−"}
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(step.amount)}
                      </p>
                    </div>
                  </div>

                  {idx < flow.steps.length - 1 && (
                    <div className="hidden md:flex items-center justify-center px-4">
                      <MoveRight className="h-4 w-4 text-muted-foreground/30 animate-pulse" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-dashed flex items-center gap-2 text-xs text-muted-foreground italic">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Correlação verificada por valor e janela temporal de 48h.
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
