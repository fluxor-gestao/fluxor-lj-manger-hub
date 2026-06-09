import { Activity, AlertOctagon, CheckCircle2, Clock, Loader2, Timer } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ACTIVE_STATUSES, daysBetween, isOverdue, type ServiceLike } from "./status";

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "muted",
  hint,
}: {
  label: string;
  value: string | number;
  icon: any;
  tone?: "primary" | "success" | "danger" | "warn" | "muted";
  hint?: string;
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600"
      : tone === "danger"
      ? "bg-destructive/10 text-destructive"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-600"
      : tone === "primary"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold tracking-tight">{value}</p>
            {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
          </div>
          <div className={`h-9 w-9 rounded-md flex items-center justify-center ${cls}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OperacaoKpis({ services }: { services: ServiceLike[] }) {
  const ativos = services.filter((s) => (ACTIVE_STATUSES as string[]).includes(s.status)).length;
  const pendentes = services.filter((s) => s.status === "pendente").length;
  const andamento = services.filter((s) => s.status === "em_andamento").length;
  const atrasados = services.filter(isOverdue).length;

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const concluidosMes = services.filter(
    (s) => s.status === "concluido" && (s.actual_end_date ?? "").startsWith(ym)
  );
  const slaDias = concluidosMes
    .map((s) => daysBetween(s.start_date, s.actual_end_date))
    .filter((n): n is number => typeof n === "number" && n >= 0);
  const slaMedio =
    slaDias.length > 0 ? Math.round(slaDias.reduce((a, b) => a + b, 0) / slaDias.length) : 0;

  // KPIs por BU
  const buCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach(s => {
      if (s.business_unit) counts[s.business_unit] = (counts[s.business_unit] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [services]);

  // KPIs por Área
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach(s => {
      if (s.responsible_sector) counts[s.responsible_sector] = (counts[s.responsible_sector] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [services]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Kpi label="Processos ativos" value={ativos} icon={Activity} tone="primary" />
        <Kpi label="Pendentes" value={pendentes} icon={Clock} tone="warn" />
        <Kpi label="Em andamento" value={andamento} icon={Loader2} tone="primary" />
        <Kpi
          label="Atrasados"
          value={atrasados}
          icon={AlertOctagon}
          tone={atrasados > 0 ? "danger" : "muted"}
        />
        <Kpi
          label="Concluídos no mês"
          value={concluidosMes.length}
          icon={CheckCircle2}
          tone="success"
        />
        <Kpi
          label="SLA médio"
          value={slaMedio ? `${slaMedio}d` : "—"}
          icon={Timer}
          tone="muted"
          hint={slaMedio ? "conclusão no mês" : "sem dados no mês"}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Activity className="h-3 w-3" /> Processos por Empresa
            </h3>
            <div className="space-y-2">
              {buCounts.length === 0 ? <p className="text-xs text-muted-foreground italic">Sem dados</p> :
               buCounts.slice(0, 5).map(([bu, count]) => (
                <div key={bu} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{bu}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Activity className="h-3 w-3" /> Processos por Área
            </h3>
            <div className="space-y-2">
              {areaCounts.length === 0 ? <p className="text-xs text-muted-foreground italic">Sem dados</p> :
               areaCounts.slice(0, 5).map(([area, count]) => (
                <div key={area} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{area}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
