import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, EmptyState, ErrorState } from "@/components/DataStates";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type Kind = "receber" | "pagar";

type Row = {
  id: string;
  due_date: string | null;
  competence_date: string | null;
  entry_date: string;
  movement_description: string | null;
  counterparty_name: string | null;
  amount_in: number | null;
  amount_out: number | null;
  total_brl: number | null;
  paid_amount: number | null;
  open_amount: number | null;
  payment_status: string | null;
  client_id: string | null;
  supplier_id: string | null;
  client: { name: string } | null;
  supplier: { name: string } | null;
};

const COLS =
  "id, due_date, competence_date, entry_date, movement_description, counterparty_name, amount_in, amount_out, total_brl, paid_amount, open_amount, payment_status, client_id, supplier_id, client:clients(name), supplier:suppliers(name)";

function statusOf(r: Row): "pago" | "parcial" | "vencido" | "aberto" {
  if (r.payment_status === "pago" || (r.open_amount ?? 0) <= 0.0049) return "pago";
  if (r.payment_status === "parcial" || (Number(r.paid_amount ?? 0) > 0 && Number(r.open_amount ?? 0) > 0)) return "parcial";
  const today = new Date().toISOString().slice(0, 10);
  if (r.due_date && r.due_date < today) return "vencido";
  return "aberto";
}

const statusBadge: Record<string, string> = {
  pago: "bg-success/15 text-success border-success/30",
  parcial: "bg-warning/15 text-warning border-warning/30",
  vencido: "bg-destructive/15 text-destructive border-destructive/30",
  aberto: "bg-muted text-muted-foreground border-border",
};

export function ContasTable({ kind }: { kind: Kind }) {
  const isReceber = kind === "receber";
  const q = useQuery({
    queryKey: ["financial-entries", "contas", kind],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_entries")
        .select(COLS)
        .eq("entry_type", isReceber ? ("receita" as any) : ("despesa" as any))
        .gt("open_amount", 0)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = q.data ?? [];
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        const total = Number(r.total_brl ?? (isReceber ? r.amount_in : r.amount_out) ?? 0);
        const paid = Number(r.paid_amount ?? 0);
        const open = Number(r.open_amount ?? Math.max(0, total - paid));
        acc.total += total;
        acc.paid += paid;
        acc.open += open;
        return acc;
      },
      { total: 0, paid: 0, open: 0 },
    );
  }, [rows, isReceber]);

  if (q.isLoading) return <Card><CardContent><LoadingState /></CardContent></Card>;
  if (q.isError) return <Card><CardContent><ErrorState onRetry={() => q.refetch()} /></CardContent></Card>;
  if (rows.length === 0) {
    return (
      <Card><CardContent>
        <EmptyState
          title={isReceber ? "Nenhuma conta a receber" : "Nenhuma conta a pagar"}
          description="Não há lançamentos em aberto."
        />
      </CardContent></Card>
    );
  }

  const partyLabel = isReceber ? "Cliente" : "Fornecedor";
  const paidLabel = isReceber ? "Valor recebido" : "Valor pago";

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="font-semibold">{partyLabel}</TableHead>
            <TableHead className="font-semibold">Descrição</TableHead>
            <TableHead className="font-semibold">Vencimento</TableHead>
            <TableHead className="font-semibold text-right">Valor total</TableHead>
            <TableHead className="font-semibold text-right">{paidLabel}</TableHead>
            <TableHead className="font-semibold text-right">Saldo aberto</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const party =
              (isReceber ? r.client?.name : r.supplier?.name) || r.counterparty_name || "—";
            const total = Number(r.total_brl ?? (isReceber ? r.amount_in : r.amount_out) ?? 0);
            const paid = Number(r.paid_amount ?? 0);
            const open = Number(r.open_amount ?? Math.max(0, total - paid));
            const st = statusOf(r);
            return (
              <TableRow key={r.id} className="even:bg-muted/20 hover:bg-muted/40">
                <TableCell className="py-1.5">{party}</TableCell>
                <TableCell className="py-1.5 max-w-[280px] truncate" title={r.movement_description ?? ""}>
                  {r.movement_description}
                </TableCell>
                <TableCell className="py-1.5 whitespace-nowrap text-xs tabular-nums">
                  {r.due_date ?? "—"}
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{fmt(total)}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums text-success">
                  {paid ? fmt(paid) : "—"}
                </TableCell>
                <TableCell className="py-1.5 text-right font-semibold tabular-nums">
                  {fmt(open)}
                </TableCell>
                <TableCell className="py-1.5">
                  <Badge variant="outline" className={statusBadge[st]}>{st}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-muted/40 font-semibold">
            <TableCell colSpan={3} className="py-2">Totais</TableCell>
            <TableCell className="py-2 text-right tabular-nums">{fmt(totals.total)}</TableCell>
            <TableCell className="py-2 text-right tabular-nums text-success">{fmt(totals.paid)}</TableCell>
            <TableCell className="py-2 text-right tabular-nums">{fmt(totals.open)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
