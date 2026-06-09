import { useState } from "react";
import { CalendarDays, MessageSquare, AlertOctagon, ListChecks, User2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  isOverdue,
  mockCount,
  overdueDays,
  type OpStatus,
  type ServiceLike,
} from "./status";

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";

export function OperacaoKanban({
  services,
  onChangeStatus,
  onOpenDetail,
}: {
  services: ServiceLike[];
  onChangeStatus: (id: string, status: OpStatus) => void;
  onOpenDetail: (s: ServiceLike) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<OpStatus | null>(null);

  return (
    <div className="grid gap-3 overflow-x-auto pb-2"
         style={{ gridTemplateColumns: `repeat(${STATUS_ORDER.length}, minmax(260px, 1fr))` }}>
      {STATUS_ORDER.map((col) => {
        const items = services.filter((s) => s.status === col);
        const isOver = dragOver === col;
        return (
          <div
            key={col}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
            onDragLeave={() => setDragOver((c) => (c === col ? null : c))}
            onDrop={() => {
              setDragOver(null);
              if (dragId) {
                const cur = services.find((s) => s.id === dragId);
                if (cur && cur.status !== col) onChangeStatus(dragId, col);
              }
              setDragId(null);
            }}
            className={`rounded-lg border bg-muted/30 p-2 min-h-[220px] transition-colors ${
              isOver ? "bg-primary/10 border-primary/30" : ""
            }`}
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {STATUS_LABEL[col]}
              </p>
              <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic px-1 py-4 text-center">Sem processos</p>
              ) : items.map((s) => {
                const overdue = isOverdue(s);
                const comments = mockCount(s.id, 6, 7);
                const tasks = mockCount(s.id, 5, 13);
                return (
                  <Card
                    key={s.id}
                    draggable
                    onDragStart={() => setDragId(s.id)}
                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                    onClick={() => onOpenDetail(s)}
                    className="p-2.5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium line-clamp-2">{s.title}</p>
                      {overdue ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] shrink-0">
                          <AlertOctagon className="h-3 w-3" />
                          {overdueDays(s)}d
                        </Badge>
                      ) : null}
                    </div>
                    {s.client?.name ? (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{s.client.name}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.business_unit ? (
                        <Badge variant="secondary" className="text-[10px] leading-none px-1 h-4">{s.business_unit}</Badge>
                      ) : null}
                      {s.responsible_sector ? (
                        <Badge variant="outline" className="text-[10px] leading-none px-1 h-4">{s.responsible_sector}</Badge>
                      ) : null}
                      {s.assignee?.full_name ? (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1 h-4">
                          <User2 className="h-3 w-3" />
                          {s.assignee.full_name}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {fmt(s.start_date)} → {fmt(s.expected_end_date)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{comments}</span>
                        <span className="inline-flex items-center gap-0.5"><ListChecks className="h-3 w-3" />{tasks}</span>
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
