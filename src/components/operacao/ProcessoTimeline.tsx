import {
  CalendarPlus,
  Play,
  Clock,
  Loader2,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Ban,
} from "lucide-react";
import { STATUS_LABEL, type ServiceLike } from "./status";

type Evt = {
  icon: any;
  label: string;
  date: string | null;
  state: "done" | "current" | "future" | "placeholder";
  hint?: string;
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export function ProcessoTimeline({ service }: { service: ServiceLike }) {
  const s = service;
  const status = s.status as keyof typeof STATUS_LABEL;
  const isPast = (k: string) => {
    // ordem lógica do fluxo
    const order = [
      "a_iniciar", "pendente", "em_andamento",
      "aguardando_cliente", "aguardando_aprovacao", "concluido",
    ];
    return order.indexOf(k) < order.indexOf(status);
  };
  const stateFor = (k: string): Evt["state"] =>
    status === k ? "current" : isPast(k) ? "done" : "future";

  const events: Evt[] = [
    { icon: CalendarPlus, label: "Processo criado", date: s.created_at, state: "done" },
    { icon: Play, label: "Processo iniciado", date: s.start_date, state: s.start_date ? "done" : "future" },
    { icon: Clock, label: STATUS_LABEL.pendente, date: status === "pendente" ? s.updated_at : null, state: stateFor("pendente") },
    { icon: Loader2, label: STATUS_LABEL.em_andamento, date: status === "em_andamento" ? s.updated_at : null, state: stateFor("em_andamento") },
    { icon: UserCheck, label: STATUS_LABEL.aguardando_cliente, date: status === "aguardando_cliente" ? s.updated_at : null, state: stateFor("aguardando_cliente") },
    { icon: ShieldCheck, label: STATUS_LABEL.aguardando_aprovacao, date: status === "aguardando_aprovacao" ? s.updated_at : null, state: stateFor("aguardando_aprovacao") },
    { icon: CheckCircle2, label: "Concluído", date: s.actual_end_date, state: s.actual_end_date ? "done" : "future" },
    { icon: FileCheck2, label: "Documento final enviado", date: null, state: "placeholder", hint: "Em breve" },
  ];

  if (status === "cancelado") {
    events.push({ icon: Ban, label: "Cancelado", date: s.updated_at, state: "current" });
  }

  return (
    <ol className="relative border-l border-border pl-6 space-y-4">
      {events.map((e, i) => {
        const Icon = e.icon;
        const dotCls =
          e.state === "done"
            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
            : e.state === "current"
            ? "bg-primary/15 text-primary border-primary/30"
            : e.state === "placeholder"
            ? "bg-muted text-muted-foreground border-border"
            : "bg-muted/50 text-muted-foreground border-border";
        return (
          <li key={i} className="relative">
            <span className={`absolute -left-[34px] top-0 h-6 w-6 rounded-full border flex items-center justify-center ${dotCls}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{e.label}</p>
              {e.hint ? (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{e.hint}</span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{e.date ? fmt(e.date) : "—"}</p>
          </li>
        );
      })}
    </ol>
  );
}
