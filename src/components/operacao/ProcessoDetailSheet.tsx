import { AlertOctagon, CalendarDays, Building2, User2, Hash, Wallet, Info, Clock, CheckCircle2, MessageSquare, Paperclip, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { supabase } from "@/integrations/supabase/client";
import { formatDevisCode } from "@/lib/formatDevis";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  isOverdue,
  overdueDays,
  slaInfo,
  type OpStatus,
  type ServiceLike,
} from "./status";
import { ProcessoTimeline } from "./ProcessoTimeline";
import { ProcessoTarefas } from "./ProcessoTarefas";
import { ProcessoComentarios } from "./ProcessoComentarios";
import { InsightsBlock, buildInsightsForService } from "./InsightsOperacionais";
import { EntityAttachments } from "../EntityAttachments";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type PaymentTone = "muted" | "ok" | "warn" | "danger" | "info";
type PaymentSummary = {
  label: string;
  tone: PaymentTone;
  total: number;
  paid: number;
  open: number;
  count: number;
};

const TONE_CLASS: Record<PaymentTone, string> = {
  muted: "bg-muted text-muted-foreground border-border",
  ok: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  warn: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-sky-500/10 text-sky-600 border-sky-500/20",
};

function usePaymentSummary(devisId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["devis-payment-summary", devisId],
    enabled: enabled && !!devisId,
    queryFn: async (): Promise<PaymentSummary> => {
      const { data, error } = await supabase
        .from("financial_entries")
        .select("amount_in, paid_amount, payment_status, open_amount, total_brl, due_date")
        .eq("document_reference", devisId!);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) {
        return { label: "Sem cobrança", tone: "muted", total: 0, paid: 0, open: 0, count: 0 };
      }
      const total = rows.reduce(
        (acc, r: any) => acc + Number(r.total_brl ?? r.amount_in ?? 0),
        0,
      );
      const paid = rows.reduce((acc, r: any) => acc + Number(r.paid_amount ?? 0), 0);
      const open = rows.reduce(
        (acc, r: any) =>
          acc +
          Number(
            r.open_amount ??
              Math.max(Number(r.total_brl ?? r.amount_in ?? 0) - Number(r.paid_amount ?? 0), 0),
          ),
        0,
      );

      const statuses = rows.map((r: any) => String(r.payment_status ?? "").toLowerCase());
      const allPaid = statuses.every((s) => s === "pago") || (total > 0 && open <= 0.009);
      const anyPaid = paid > 0;
      const today = new Date().toISOString().slice(0, 10);
      const anyOverdue = rows.some(
        (r: any) =>
          r.due_date &&
          r.due_date < today &&
          String(r.payment_status ?? "").toLowerCase() !== "pago" &&
          Number(r.paid_amount ?? 0) < Number(r.total_brl ?? r.amount_in ?? 0),
      );

      if (allPaid) {
        return { label: "Pago", tone: "ok", total, paid, open, count: rows.length };
      }
      if (anyOverdue) {
        return {
          label: anyPaid ? "Parcial · vencido" : "Vencido",
          tone: "danger",
          total,
          paid,
          open,
          count: rows.length,
        };
      }
      if (anyPaid) {
        return { label: "Pagamento parcial", tone: "warn", total, paid, open, count: rows.length };
      }
      return {
        label: "Aguardando pagamento",
        tone: "info",
        total,
        paid,
        open,
        count: rows.length,
      };
    },
  });
}

export function ProcessoDetailSheet({
  service,
  open,
  onOpenChange,
  onChangeStatus,
}: {
  service: ServiceLike | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChangeStatus: (id: string, status: OpStatus) => void;
}) {
  const payment = usePaymentSummary(service?.devis_id, open && !!service?.devis_id);

  if (!service) return null;
  const overdue = isOverdue(service);
  const { planned, elapsed } = slaInfo(service);
  const insights = buildInsightsForService(service);
  const code = service.devis?.devis_number ?? null;
  const summary = payment.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl lg:max-w-[50vw] overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <SheetTitle className="text-xl leading-tight">
                {code ? <span className="text-primary">{formatDevisCode(code, service.devis_id || undefined)}</span> : null}
                {code ? " — " : null}
                {service.title}
              </SheetTitle>
              <SheetDescription className="text-xs">
                <span className="inline-flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {code ?? service.id.slice(0, 8)}
                </span>
                {service.client?.name ? <> · {service.client.name}</> : null}
              </SheetDescription>
            </div>
            {overdue ? (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                <AlertOctagon className="h-3.5 w-3.5" />
                Atrasado {overdueDays(service)}d
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 items-center pt-2">
            {/* Status financeiro do Devis (substitui o badge operacional) */}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={`gap-1 cursor-default ${
                      TONE_CLASS[summary?.tone ?? (service.devis_id ? "muted" : "muted")]
                    }`}
                  >
                    <Wallet className="h-3 w-3" />
                    {payment.isLoading && service.devis_id
                      ? "Carregando…"
                      : service.devis_id
                      ? summary?.label ?? "Sem cobrança"
                      : "Sem Devis vinculado"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {service.devis_id ? (
                    summary && summary.count > 0 ? (
                      <div className="space-y-0.5">
                        <p>
                          <strong>Pago:</strong> {brl(summary.paid)}
                        </p>
                        <p>
                          <strong>Em aberto:</strong> {brl(summary.open)}
                        </p>
                        <p>
                          <strong>Total:</strong> {brl(summary.total)} ({summary.count}{" "}
                          lançamento{summary.count > 1 ? "s" : ""})
                        </p>
                      </div>
                    ) : (
                      <p>Nenhum lançamento financeiro vinculado a este Devis.</p>
                    )
                  ) : (
                    <p>Este processo não possui Devis vinculado.</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {service.business_unit ? (
              <Badge variant="secondary" className="gap-1">
                <Building2 className="h-3 w-3" /> {service.business_unit}
              </Badge>
            ) : null}
            {service.assignee?.full_name ? (
              <Badge variant="secondary" className="gap-1">
                <User2 className="h-3 w-3" /> {service.assignee.full_name}
              </Badge>
            ) : null}
            <Badge variant="secondary" className="gap-1">
              <CalendarDays className="h-3 w-3" />
              {fmt(service.start_date)} → {fmt(service.expected_end_date)}
            </Badge>
            <div className="ml-auto">
              <Select
                value={service.status}
                onValueChange={(v) => onChangeStatus(service.id, v as OpStatus)}
              >
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="comments">Comentários</TabsTrigger>
            <TabsTrigger value="files">Anexos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <Field label="Início" value={fmt(service.start_date)} />
                  <Field label="Previsão" value={fmt(service.expected_end_date)} />
                  <Field label="Conclusão real" value={fmt(service.actual_end_date)} />
                  <Field label="Setor responsável" value={service.responsible_sector ?? "—"} />
                  <Field
                    label="SLA"
                    value={
                      planned != null && elapsed != null
                        ? `${elapsed}/${planned} dias`
                        : "—"
                    }
                  />
                  <Field label="Atualizado em" value={new Date(service.updated_at).toLocaleString("pt-BR")} />
                </div>
                {service.description ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Descrição</p>
                    <p className="text-sm whitespace-pre-wrap">{service.description}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Insights operacionais
              </p>
              <InsightsBlock items={insights} dense />
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardContent className="py-4">
                <ProcessoTimeline service={service} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <ProcessoTarefas />
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <ProcessoComentarios service={service} />
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <div className="text-center text-xs text-muted-foreground py-10 border border-dashed rounded-lg">
              Upload e gestão de anexos em breve.
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
