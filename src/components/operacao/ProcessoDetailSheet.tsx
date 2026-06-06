import { AlertOctagon, CalendarDays, Building2, User2, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

import {
  STATUS_BADGE,
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

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

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
  if (!service) return null;
  const overdue = isOverdue(service);
  const { planned, elapsed } = slaInfo(service);
  const insights = buildInsightsForService(service);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <SheetTitle className="text-xl leading-tight">{service.title}</SheetTitle>
              <SheetDescription className="text-xs">
                <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" />{service.id.slice(0, 8)}</span>
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
            <Badge variant="outline" className={STATUS_BADGE[service.status as OpStatus]}>
              {STATUS_LABEL[service.status as OpStatus] ?? service.status}
            </Badge>
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
