import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { useFinanceiroCatalogs } from "@/hooks/useFinanceiroCatalogs";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const today = () => new Date().toISOString().slice(0, 10);

export type PayableEntry = {
  id: string;
  movement_description: string | null;
  counterparty_name: string | null;
  supplier?: { name: string } | null;
  total_brl: number | null;
  amount_out: number | null;
  paid_amount: number | null;
  open_amount: number | null;
  payment_status: string | null;
};

type BankAccount = { id: string; bank_name: string; account_number: string | null };

export function RegisterPaymentDialog({
  entry, open, onOpenChange,
}: {
  entry: PayableEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const { paymentMethods } = useFinanceiroCatalogs();

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bank_accounts")
        .select("id, bank_name, account_number")
        .eq("active", true)
        .order("bank_name");
      return (data ?? []) as BankAccount[];
    },
  });

  const totalEntry = Number(entry?.total_brl ?? entry?.amount_out ?? 0);
  const paidPrev = Number(entry?.paid_amount ?? 0);
  const openAmount = Number(entry?.open_amount ?? Math.max(0, totalEntry - paidPrev));

  // Form state
  const [valueStr, setValueStr] = useState("");
  const [paidDate, setPaidDate] = useState<string>(today());
  const [paymentAccountId, setPaymentAccountId] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isFull, setIsFull] = useState(true);
  const [confirmOverpay, setConfirmOverpay] = useState(false);

  // Reset on open / entry change
  useEffect(() => {
    if (!open || !entry) return;
    setValueStr(openAmount.toFixed(2));
    setPaidDate(today());
    setPaymentAccountId("");
    setPaymentMethodId("");
    setNotes("");
    setIsFull(true);
    setConfirmOverpay(false);
  }, [open, entry, openAmount]);

  const valueNum = useMemo(() => {
    const n = Number(String(valueStr).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [valueStr]);

  // Sync isFull → value
  const handleFullToggle = (v: boolean) => {
    setIsFull(v);
    if (v) setValueStr(openAmount.toFixed(2));
  };

  const overpay = valueNum > openAmount + 0.0049;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!entry) throw new Error("Cobrança inválida");
      const newPaid = +(paidPrev + valueNum).toFixed(2);
      const totalRef = totalEntry > 0 ? totalEntry : newPaid;
      const newOpen = Math.max(0, +(totalRef - newPaid).toFixed(2));
      const fullyPaid = newOpen <= 0.0049;

      const patch: Record<string, any> = {
        paid_amount: newPaid,
        open_amount: newOpen,
        paid_at: fullyPaid ? new Date(paidDate + "T12:00:00").toISOString() : null,
        payment_status: fullyPaid ? "pago" : "parcial",
      };
      if (fullyPaid) patch.conciliation_status = "conciliado";
      if (paymentAccountId) patch.payment_account_id = paymentAccountId;
      if (paymentMethodId) patch.payment_method_id = paymentMethodId;
      if (notes.trim()) patch.notes = notes.trim();

      const { error } = await supabase
        .from("financial_entries")
        .update(patch as any)
        .eq("id", entry.id);
      if (error) throw error;
      return { fullyPaid, newPaid, newOpen };
    },
    onSuccess: (res) => {
      toast.success(res.fullyPaid ? "Pagamento total registrado" : "Pagamento parcial registrado", {
        description: `Pago: ${fmt(res.newPaid)} · Saldo: ${fmt(res.newOpen)}`,
      });
      qc.invalidateQueries({ queryKey: ["contas-a-pagar"] });
      qc.invalidateQueries({ queryKey: ["contas-a-receber"] });
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast.error("Falha ao registrar pagamento", { description: e?.message ?? "Tente novamente." });
    },
  });

  const submit = () => {
    if (!entry) return;
    if (!(valueNum > 0)) {
      toast.error("Informe um valor maior que zero");
      return;
    }
    if (!paidDate) {
      toast.error("Informe a data do pagamento");
      return;
    }
    if (overpay && !confirmOverpay) {
      toast.warning("Valor maior que o saldo aberto", {
        description: "Marque a confirmação para prosseguir.",
      });
      return;
    }
    mutation.mutate();
  };

  if (!entry) return null;
  const fornecedor = entry.supplier?.name || entry.counterparty_name || "Fornecedor";

  return (
    <Dialog open={open} onOpenChange={(v) => !mutation.isPending && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Registrar pagamento</DialogTitle>
          <DialogDescription>
            {fornecedor} — {entry.movement_description ?? "—"}
          </DialogDescription>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Mini label="Valor total" value={fmt(totalEntry)} />
          <Mini label="Já pago" value={fmt(paidPrev)} tone="success" />
          <Mini label="Saldo aberto" value={fmt(openAmount)} tone="primary" />
        </div>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pg-valor">Valor pago (R$)</Label>
              <Input
                id="pg-valor"
                type="number" step="0.01" min="0" inputMode="decimal"
                value={valueStr}
                disabled={isFull}
                onChange={(e) => setValueStr(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pg-data">Data do pagamento</Label>
              <Input
                id="pg-data" type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={isFull} onCheckedChange={(v) => handleFullToggle(!!v)} />
            Pagamento total ({fmt(openAmount)})
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Conta de pagamento</Label>
              <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bank_name}{b.account_number ? ` · ${b.account_number}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pg-obs">Observação</Label>
            <Textarea
              id="pg-obs" rows={3}
              maxLength={500}
              placeholder="Anotações sobre o pagamento (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {overpay && (
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-sm flex gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>
                  O valor informado ({fmt(valueNum)}) ultrapassa o saldo aberto ({fmt(openAmount)}).
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={confirmOverpay} onCheckedChange={(v) => setConfirmOverpay(!!v)} />
                  Confirmo registrar este valor mesmo assim
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "success" | "primary" }) {
  const c = tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-md border bg-card p-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-display font-bold tabular-nums text-sm mt-0.5 ${c}`}>{value}</p>
    </div>
  );
}
