import { AlertOctagon, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

function SlaBadge({ s }: { s: ServiceLike }) {
  const { planned, elapsed } = slaInfo(s);
  if (planned == null || elapsed == null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = planned > 0 ? (elapsed / planned) * 100 : 0;
  const tone =
    s.status === "concluido"
      ? "text-emerald-600"
      : pct >= 100
      ? "text-destructive"
      : pct >= 80
      ? "text-amber-600"
      : "text-muted-foreground";
  return (
    <span className={`text-xs font-medium ${tone}`}>
      {elapsed}/{planned}d
    </span>
  );
}

export function OperacaoLista({
  services,
  onChangeStatus,
  onOpenDetail,
}: {
  services: ServiceLike[];
  onChangeStatus: (id: string, status: OpStatus) => void;
  onOpenDetail: (s: ServiceLike) => void;
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Processo</TableHead>
            <TableHead>BU</TableHead>
            <TableHead>Responsável/Setor</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Previsão</TableHead>
            <TableHead>Conclusão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                Nenhum processo encontrado
              </TableCell>
            </TableRow>
          ) : services.map((s) => {
            const overdue = isOverdue(s);
            return (
              <TableRow key={s.id} className={overdue ? "bg-destructive/5" : ""}>
                <TableCell>
                  <button
                    className="text-left hover:text-primary transition-colors"
                    onClick={() => onOpenDetail(s)}
                  >
                    <p className="font-medium leading-tight">{s.title}</p>
                    {s.description ? (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{s.description}</p>
                    ) : null}
                    {s.client?.name ? (
                      <p className="text-[11px] text-muted-foreground">{s.client.name}</p>
                    ) : null}
                  </button>
                </TableCell>
                <TableCell className="text-xs">{s.business_unit ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {s.assignee?.full_name ?? s.responsible_sector ?? "—"}
                </TableCell>
                <TableCell className="text-xs">{fmt(s.start_date)}</TableCell>
                <TableCell className="text-xs">
                  <span className="inline-flex items-center gap-1">
                    {fmt(s.expected_end_date)}
                    {overdue ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                        <AlertOctagon className="h-3 w-3" />
                        {overdueDays(s)}d
                      </Badge>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{fmt(s.actual_end_date)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_BADGE[s.status as OpStatus] ?? ""}>
                    {STATUS_LABEL[s.status as OpStatus] ?? s.status}
                  </Badge>
                </TableCell>
                <TableCell><SlaBadge s={s} /></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onOpenDetail(s)}>Ver detalhes</DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Alterar status</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {STATUS_ORDER.map((st) => (
                            <DropdownMenuItem key={st} onClick={() => onChangeStatus(s.id, st)}>
                              {STATUS_LABEL[st]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onChangeStatus(s.id, "concluido")}>
                        Finalizar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onChangeStatus(s.id, "cancelado")}
                      >
                        Cancelar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
