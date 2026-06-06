import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FaturaPreviewDialog } from "./FaturaPreviewDialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FilePlus2, Send, BellRing, DollarSign, CheckCircle2, Circle, Clock,
  Mail, Eye, FileText, AlertTriangle, CalendarClock, Sparkles,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtDateBR = (iso: string | null | undefined) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—";

export type CobrancaRow = {
  id: string;
  due_date: string | null;
  entry_date: string;
  competence_month?: string | null;
  movement_description: string | null;
  counterparty_name: string | null;
  amount_in: number | null;
  total_brl: number | null;
  paid_amount: number | null;
  open_amount: number | null;
  payment_status: string | null;
  document_reference?: string | null;
  notes?: string | null;
  client_id: string | null;
  client: { name: string } | null;
};

type Status = "pago" | "parcial" | "vencido" | "aberto";

function statusOf(r: CobrancaRow): Status {
  const today = new Date().toISOString().slice(0, 10);
  if (r.payment_status === "pago" || Number(r.open_amount ?? 0) <= 0.0049) return "pago";
  if (
    r.payment_status === "parcial" ||
    (Number(r.paid_amount ?? 0) > 0 && Number(r.open_amount ?? 0) > 0)
  ) return "parcial";
  if (r.due_date && r.due_date < today) return "vencido";
  return "aberto";
}

const statusBadge: Record<Status, string> = {
  pago: "bg-success/15 text-success border-success/30",
  parcial: "bg-warning/15 text-warning border-warning/30",
  vencido: "bg-destructive/15 text-destructive border-destructive/30",
  aberto: "bg-muted text-muted-foreground border-border",
};

const statusLabel: Record<Status, string> = {
  pago: "Pago",
  parcial: "Parcial",
  vencido: "Vencido",
  aberto: "Em aberto",
};

type StepState = "done" | "pending" | "suggested";
type Step = {
  key: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  state: StepState;
  at?: string;
};

function buildTimeline(r: CobrancaRow): Step[] {
  const st = statusOf(r);
  const paid = Number(r.paid_amount ?? 0);

  const created: Step = {
    key: "created", label: "Cobrança criada",
    description: "Recebível registrado no sistema",
    icon: FilePlus2, state: "done", at: fmtDateBR(r.entry_date),
  };
  const invoice: Step = {
    key: "invoice", label: "Fatura gerada",
    description: r.document_reference ? `Ref. ${r.document_reference}` : "Documento de cobrança",
    icon: FileText,
    state: r.document_reference ? "done" : "pending",
  };
  const sent: Step = {
    key: "sent", label: "E-mail enviado",
    description: "Envio da cobrança ao cliente",
    icon: Mail, state: "pending",
  };
  const viewed: Step = {
    key: "viewed", label: "Cliente visualizou",
    description: "Confirmação de leitura",
    icon: Eye, state: "pending",
  };

  const reminder: Step = (() => {
    if (st === "vencido") {
      return {
        key: "reminder", label: "Lembrete sugerido",
        description: "Cobrança vencida — enviar lembrete",
        icon: BellRing, state: "suggested",
      };
    }
    if (st === "pago") {
      return {
        key: "reminder", label: "Lembrete não necessário",
        description: "Cobrança quitada",
        icon: BellRing, state: "done",
      };
    }
    return {
      key: "reminder", label: "Lembrete sugerido",
      description: "Acompanhar próximo do vencimento",
      icon: BellRing, state: "suggested",
    };
  })();

  const payment: Step = paid > 0
    ? {
        key: "payment",
        label: st === "pago" ? "Pagamento registrado" : "Pagamento parcial",
        description: `${fmt(paid)} recebido`,
        icon: DollarSign, state: "done",
      }
    : {
        key: "payment", label: "Pagamento registrado",
        description: "Aguardando confirmação",
        icon: DollarSign, state: "pending",
      };

  return [created, invoice, sent, viewed, reminder, payment];
}

type NextAction = { tone: "danger" | "warning" | "success"; title: string; description: string };

function nextActionOf(r: CobrancaRow): NextAction {
  const st = statusOf(r);
  if (st === "pago") {
    return { tone: "success", title: "Cobrança encerrada", description: "Nenhuma ação necessária." };
  }
  if (st === "vencido") {
    const days = r.due_date
      ? Math.max(
          1,
          Math.floor(
            (Date.now() - new Date(r.due_date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24),
          ),
        )
      : 0;
    return {
      tone: "danger",
      title: "Enviar lembrete de pagamento",
      description: days
        ? `Cobrança vencida há ${days} dia(s). Recomendado contatar o cliente.`
        : "Cobrança vencida. Recomendado enviar lembrete imediato.",
    };
  }
  return {
    tone: "warning",
    title: "Acompanhar próximo do vencimento",
    description: r.due_date
      ? `Vencimento em ${fmtDateBR(r.due_date)}. Considere enviar lembrete amigável.`
      : "Sem data de vencimento definida.",
  };
}

const nextActionStyles: Record<NextAction["tone"], string> = {
  danger: "border-destructive/40 bg-destructive/5",
  warning: "border-warning/40 bg-warning/5",
  success: "border-success/40 bg-success/5",
};
const nextActionIcon: Record<NextAction["tone"], React.ComponentType<{ className?: string }>> = {
  danger: AlertTriangle,
  warning: CalendarClock,
  success: CheckCircle2,
};

export function CobrancaDetailSheet({
  row, open, onOpenChange,
}: {
  row: CobrancaRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const steps = useMemo(() => (row ? buildTimeline(row) : []), [row]);
  const next = useMemo(() => (row ? nextActionOf(row) : null), [row]);
  const [faturaOpen, setFaturaOpen] = useState(false);

  if (!row) return null;

  const st = statusOf(row);
  const cliente = row.client?.name || row.counterparty_name || "—";
  const total = Number(row.total_brl ?? row.amount_in ?? 0);
  const paid = Number(row.paid_amount ?? 0);
  const open_ = Number(row.open_amount ?? Math.max(0, total - paid));
  const NextIcon = next ? nextActionIcon[next.tone] : Sparkles;

  const placeholder = (label: string) =>
    toast.info(`${label} — em breve`, {
      description: `${cliente} · ${fmt(open_)}`,
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="font-display text-xl">{cliente}</SheetTitle>
            <Badge variant="outline" className={statusBadge[st]}>{statusLabel[st]}</Badge>
          </div>
          <SheetDescription>
            {row.movement_description ?? "Cobrança sem descrição"}
          </SheetDescription>
        </SheetHeader>

        {/* Resumo de valores */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <ValueTile label="Valor total" value={fmt(total)} />
          <ValueTile label="Recebido" value={fmt(paid)} tone="success" />
          <ValueTile label="Saldo aberto" value={fmt(open_)} tone="primary" />
        </div>

        {/* Detalhes */}
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <DetailItem label="Vencimento" value={fmtDateBR(row.due_date)} />
          <DetailItem label="Competência" value={row.competence_month ?? "—"} />
          <DetailItem label="Lançamento" value={fmtDateBR(row.entry_date)} />
          <DetailItem label="Referência" value={row.document_reference ?? "—"} />
          <div className="col-span-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Observações</p>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
              {row.notes?.trim() ? row.notes : <span className="text-muted-foreground italic">Sem observações</span>}
            </p>
          </div>
        </div>

        <Separator className="my-5" />

        {/* Próxima ação */}
        {next && (
          <div className={`rounded-lg border p-3 flex gap-3 ${nextActionStyles[next.tone]}`}>
            <div className="mt-0.5">
              <NextIcon className={`h-5 w-5 ${
                next.tone === "danger" ? "text-destructive"
                  : next.tone === "warning" ? "text-warning"
                  : "text-success"
              }`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Próxima ação sugerida
              </p>
              <p className="font-semibold mt-0.5">{next.title}</p>
              <p className="text-sm text-muted-foreground">{next.description}</p>
            </div>
          </div>
        )}

        {/* Timeline / Stepper */}
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Esteira da cobrança
          </p>
          <ol className="relative">
            {steps.map((s, i) => (
              <TimelineItem key={s.key} step={s} isLast={i === steps.length - 1} />
            ))}
          </ol>
        </div>

        {/* Ações */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setFaturaOpen(true)}>
            <FileText className="h-4 w-4 mr-2" /> Gerar fatura
          </Button>
          <Button variant="outline" onClick={() => placeholder("Enviar cobrança")}>
            <Send className="h-4 w-4 mr-2" /> Enviar cobrança
          </Button>
          <Button variant="outline" onClick={() => placeholder("Reenviar lembrete")}>
            <BellRing className="h-4 w-4 mr-2" /> Reenviar lembrete
          </Button>
          <Button onClick={() => placeholder("Registrar pagamento")}>
            <DollarSign className="h-4 w-4 mr-2" /> Registrar pagamento
          </Button>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          Ações de envio e geração são placeholders nesta etapa.
        </p>
      </SheetContent>

      <FaturaPreviewDialog row={row} open={faturaOpen} onOpenChange={setFaturaOpen} />
    </Sheet>
  );
}

function ValueTile({ label, value, tone }: { label: string; value: string; tone?: "success" | "primary" }) {
  const color =
    tone === "success" ? "text-success"
      : tone === "primary" ? "text-primary"
      : "text-foreground";
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-display font-bold tabular-nums mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function TimelineItem({ step, isLast }: { step: Step; isLast: boolean }) {
  const Icon = step.icon;
  const dot =
    step.state === "done"
      ? "bg-success text-success-foreground border-success"
      : step.state === "suggested"
        ? "bg-warning/15 text-warning border-warning border-dashed"
        : "bg-muted text-muted-foreground border-border";
  const StateIcon =
    step.state === "done" ? CheckCircle2 : step.state === "suggested" ? Sparkles : Circle;
  const stateText =
    step.state === "done" ? "Concluído"
      : step.state === "suggested" ? "Sugerido"
      : "Pendente";
  const stateClr =
    step.state === "done" ? "text-success"
      : step.state === "suggested" ? "text-warning"
      : "text-muted-foreground";

  return (
    <li className="relative pl-10 pb-5 last:pb-0">
      {!isLast && (
        <span className="absolute left-[15px] top-7 bottom-0 w-px bg-border" aria-hidden />
      )}
      <span className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 ${dot}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-tight">{step.label}</p>
          {step.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
          )}
          {step.at && (
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" /> {step.at}
            </p>
          )}
        </div>
        <span className={`text-[11px] font-medium whitespace-nowrap flex items-center gap-1 ${stateClr}`}>
          <StateIcon className="h-3 w-3" /> {stateText}
        </span>
      </div>
    </li>
  );
}
