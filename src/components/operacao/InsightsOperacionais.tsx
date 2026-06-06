import { AlertOctagon, AlertTriangle, Clock, Sparkles, TrendingUp, UserX } from "lucide-react";
import { ACTIVE_STATUSES, daysBetween, isOverdue, overdueDays, STATUS_LABEL, type ServiceLike } from "./status";

type Insight = {
  icon: any;
  title: string;
  description: string;
  tone: "warn" | "danger" | "info";
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function buildInsightsForService(s: ServiceLike): Insight[] {
  const items: Insight[] = [];
  if (isOverdue(s)) {
    items.push({
      icon: AlertOctagon,
      title: `Atrasado há ${overdueDays(s)} dias`,
      description: `Prazo previsto era ${new Date(s.expected_end_date!).toLocaleDateString("pt-BR")}.`,
      tone: "danger",
    });
  }
  const idle = daysBetween(s.updated_at, todayStr()) ?? 0;
  if (idle >= 7 && s.status !== "concluido" && s.status !== "cancelado") {
    items.push({
      icon: Clock,
      title: `Parado há ${idle} dias`,
      description: `Sem alterações desde ${new Date(s.updated_at).toLocaleDateString("pt-BR")}.`,
      tone: "warn",
    });
  }
  if (s.expected_end_date && !isOverdue(s)) {
    const left = daysBetween(todayStr(), s.expected_end_date) ?? 0;
    if (left >= 0 && left <= 3 && s.status !== "concluido") {
      items.push({
        icon: AlertTriangle,
        title: `Prazo em ${left} dia(s)`,
        description: "Aproxima-se da data prevista de conclusão.",
        tone: "warn",
      });
    }
  }
  if (s.status === "pendente" && !s.assigned_to) {
    items.push({
      icon: UserX,
      title: "Pendente sem responsável",
      description: "Atribua um responsável para destravar a execução.",
      tone: "info",
    });
  }
  return items;
}

export function buildInsightsForBoard(services: ServiceLike[]): Insight[] {
  const items: Insight[] = [];
  const ativos = services.filter((s) => (ACTIVE_STATUSES as string[]).includes(s.status));
  if (ativos.length > 0) {
    const counts = new Map<string, number>();
    ativos.forEach((s) => counts.set(s.status, (counts.get(s.status) ?? 0) + 1));
    const [topStatus, topCount] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    const pct = (topCount / ativos.length) * 100;
    if (pct >= 40) {
      items.push({
        icon: TrendingUp,
        title: `Concentração em ${STATUS_LABEL[topStatus as keyof typeof STATUS_LABEL]}`,
        description: `${topCount} de ${ativos.length} processos ativos (${pct.toFixed(0)}%) estão nesta etapa.`,
        tone: "info",
      });
    }
  }
  const pendentesSemResp = services.filter((s) => s.status === "pendente" && !s.assigned_to).length;
  if (pendentesSemResp >= 3) {
    items.push({
      icon: UserX,
      title: `${pendentesSemResp} pendentes sem responsável`,
      description: "Distribua as pendências para destravar a operação.",
      tone: "warn",
    });
  }
  const atrasadosCount = services.filter(isOverdue).length;
  if (atrasadosCount > 0) {
    items.push({
      icon: AlertOctagon,
      title: `${atrasadosCount} processo(s) atrasado(s)`,
      description: "Revise prazos e priorize a regularização.",
      tone: "danger",
    });
  }
  return items;
}

export function InsightsBlock({ items, dense = false }: { items: Insight[]; dense?: boolean }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        Nenhum alerta — está tudo sob controle por aqui.
      </div>
    );
  }
  return (
    <div className={dense ? "space-y-2" : "grid gap-2 sm:grid-cols-2"}>
      {items.map((i, idx) => {
        const Icon = i.icon;
        const cls =
          i.tone === "danger"
            ? "border-destructive/20 bg-destructive/5 text-destructive"
            : i.tone === "warn"
            ? "border-amber-500/20 bg-amber-500/5 text-amber-600"
            : "border-primary/20 bg-primary/5 text-primary";
        return (
          <div key={idx} className={`flex gap-2 rounded-lg border p-3 ${cls}`}>
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
