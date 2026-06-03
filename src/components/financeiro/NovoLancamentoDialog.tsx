import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CurrencyInputBRL } from "@/components/ui/currency-input-brl";
import { useFinanceiroCatalogs } from "@/hooks/useFinanceiroCatalogs";

type BankAccount = { id: string; bank_name: string; account_number: string | null };

export type NovoLancamentoPrefill = Partial<{
  entry_type: EntryType;
  description: string;
  amount: string;
  competence_date: string;
  due_date: string;
  payment_account_id: string;
  is_paid: boolean;
  paid_at: string;
  paid_amount: string;
  business_unit: string;
  reference_code: string;
}>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the entry(ies) is created. Receives the id of the first inserted entry. */
  onCreated?: (firstEntryId?: string) => void | Promise<void>;
  bankAccounts: BankAccount[];
  /** Values to prefill when the dialog opens. */
  prefill?: NovoLancamentoPrefill;
  /** Override the dialog title. */
  title?: string;
  /** Override the submit button label. */
  submitLabel?: string;
}

type EntryType = "receita" | "despesa" | "transferencia";
type Allocation = {
  category_id: string;
  cost_center_id: string;
  percent: string;
  amount: string;
  notes: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;
const monthFromDate = (d: string) => (d ? d.slice(0, 7) : "");
const addMonthsISO = (iso: string, months: number) => {
  if (!iso) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
};

const emptyForm = () => ({
  entry_type: "despesa" as EntryType,
  party_id: "",
  description: "",
  amount: "0",
  competence_date: todayISO(),
  category_id: "",
  cost_center_id: "",
  reference_code: "",
  business_unit: "",
  enable_allocation: false,

  installment_total: "1",
  installment_number: "1",
  due_date: "",
  payment_method_id: "",
  payment_account_id: "",
  is_paid: false,
  paid_at: todayISO(),
  paid_amount: "0",

  notes: "",
});

export function NovoLancamentoDialog({
  open, onOpenChange, onCreated, bankAccounts, prefill, title, submitLabel,
}: Props) {
  const { user } = useAuth();
  const catalogs = useFinanceiroCatalogs();
  const [form, setForm] = useState(emptyForm());

  // Apply prefill whenever the dialog opens
  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm(), ...(prefill ?? {}) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const [allocations, setAllocations] = useState<Allocation[]>([
    { category_id: "", cost_center_id: "", percent: "100", amount: "0", notes: "" },
  ]);

  const totalAmount = Number(form.amount) || 0;
  const installments = Math.max(1, parseInt(form.installment_total || "1", 10) || 1);
  const parcelaAmount = round2(totalAmount / installments);

  const categoryOptions = useMemo(() => {
    const k = form.entry_type === "receita" ? "receita" : form.entry_type === "despesa" ? "despesa" : null;
    if (!k) return catalogs.categories;
    return catalogs.categories.filter((c) => c.kind === k || c.kind === "ambos");
  }, [catalogs.categories, form.entry_type]);

  const partyOptions = form.entry_type === "receita"
    ? catalogs.clients
    : form.entry_type === "despesa"
      ? catalogs.suppliers
      : [];

  const allocSum = useMemo(() => {
    return allocations.reduce(
      (acc, a) => ({
        percent: acc.percent + (Number(a.percent) || 0),
        amount: acc.amount + (Number(a.amount) || 0),
      }),
      { percent: 0, amount: 0 },
    );
  }, [allocations]);

  const allocValid =
    !form.enable_allocation ||
    (allocations.length > 0 &&
      Math.abs(allocSum.amount - totalAmount) < 0.01 &&
      allocations.every((a) => a.category_id || a.cost_center_id));

  const updateAllocation = (idx: number, patch: Partial<Allocation>) => {
    setAllocations((prev) => {
      const next = [...prev];
      const merged = { ...next[idx], ...patch };
      // recalc cross-field
      if ("percent" in patch) {
        const p = Number(patch.percent) || 0;
        merged.amount = round2((totalAmount * p) / 100).toFixed(2);
      } else if ("amount" in patch) {
        const a = Number(patch.amount) || 0;
        merged.percent = totalAmount > 0 ? round2((a / totalAmount) * 100).toString() : "0";
      }
      next[idx] = merged;
      return next;
    });
  };

  const addAllocation = () =>
    setAllocations((p) => [...p, { category_id: "", cost_center_id: "", percent: "0", amount: "0", notes: "" }]);
  const removeAllocation = (i: number) =>
    setAllocations((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));

  const reset = () => {
    setForm(emptyForm());
    setAllocations([{ category_id: "", cost_center_id: "", percent: "100", amount: "0", notes: "" }]);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.description.trim()) throw new Error("Descrição obrigatória");
      if (totalAmount <= 0) throw new Error("Valor deve ser maior que zero");
      if (!form.competence_date) throw new Error("Data de competência obrigatória");
      if (form.enable_allocation && !allocValid) {
        throw new Error("Rateio inválido: soma dos valores deve igualar o valor do lançamento");
      }

      const today = todayISO();

      for (let i = 1; i <= installments; i++) {
        const dueDate = form.due_date ? addMonthsISO(form.due_date, i - 1) : null;

        // status / saldos
        let payment_status: string;
        let paid_amount: number;
        let open_amount: number;

        if (form.is_paid) {
          const informed = Number(form.paid_amount) || 0;
          // dividir pago entre parcelas: simplificação — assume valor por parcela
          const pagoParcela = installments === 1 ? informed : parcelaAmount;
          if (pagoParcela >= parcelaAmount) {
            payment_status = "pago";
            paid_amount = parcelaAmount;
            open_amount = 0;
          } else if (pagoParcela > 0) {
            payment_status = "parcial";
            paid_amount = pagoParcela;
            open_amount = round2(parcelaAmount - pagoParcela);
          } else {
            payment_status = "aberto";
            paid_amount = 0;
            open_amount = parcelaAmount;
          }
        } else if (dueDate && dueDate < today) {
          payment_status = "vencido";
          paid_amount = 0;
          open_amount = parcelaAmount;
        } else {
          payment_status = "aberto";
          paid_amount = 0;
          open_amount = parcelaAmount;
        }

        const conciliation_status = payment_status === "pago" ? "conciliado" : "pendente";

        const insertRow: Record<string, any> = {
          entry_date: form.competence_date,
          competence_date: form.competence_date,
          competence_month: monthFromDate(form.competence_date),
          business_unit: form.business_unit || null,
          movement_description: form.description,
          counterparty_name: null,
          amount_in: form.entry_type === "receita" ? parcelaAmount : 0,
          amount_out: form.entry_type === "despesa" ? parcelaAmount : 0,
          entry_type: form.entry_type,
          bank_account_id: form.payment_account_id || null,
          source_type: "manual",
          user_id: user?.id,

          // novos campos
          supplier_id: form.entry_type === "despesa" && form.party_id ? form.party_id : null,
          client_id: form.entry_type === "receita" && form.party_id ? form.party_id : null,
          category_id: form.enable_allocation ? null : form.category_id || null,
          cost_center_id: form.enable_allocation ? null : form.cost_center_id || null,
          reference_code: form.reference_code || null,
          payment_method_id: form.payment_method_id || null,
          payment_account_id: form.payment_account_id || null,
          installment_number: i,
          installment_total: installments,
          due_date: dueDate,
          paid_at: payment_status === "pago" || payment_status === "parcial" ? form.paid_at : null,
          paid_amount,
          open_amount,
          payment_status,
          conciliation_status,
          notes: form.notes || null,
        };

        const { data: inserted, error } = await supabase
          .from("financial_entries")
          .insert(insertRow as any)
          .select("id")
          .single();
        if (error) throw error;

        if (form.enable_allocation && inserted) {
          const allocRows = allocations.map((a) => {
            const linePercent = Number(a.percent) || 0;
            const lineAmount = round2((parcelaAmount * linePercent) / 100);
            return {
              entry_id: inserted.id,
              category_id: a.category_id || null,
              cost_center_id: a.cost_center_id || null,
              amount: lineAmount,
              percent: linePercent,
              notes: a.notes || null,
            };
          });
          const { error: aErr } = await supabase
            .from("entry_allocations")
            .insert(allocRows as any);
          if (aErr) throw aErr;
        }
      }
    },
    onSuccess: () => {
      toast.success(installments > 1 ? `${installments} parcelas criadas!` : "Lançamento criado!");
      reset();
      onOpenChange(false);
      onCreated?.();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar lançamento"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* SEÇÃO A — Informações */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Informações do lançamento
            </h3>

            <div>
              <Label>Tipo</Label>
              <div className="flex gap-2 mt-1">
                {(["receita", "despesa", "transferencia"] as EntryType[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={form.entry_type === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForm({ ...form, entry_type: t, party_id: "", category_id: "" })}
                  >
                    {t === "receita" ? "Receita" : t === "despesa" ? "Despesa" : "Transferência"}
                  </Button>
                ))}
              </div>
            </div>

            {form.entry_type !== "transferencia" && (
              <div>
                <Label>{form.entry_type === "receita" ? "Cliente" : "Fornecedor"}</Label>
                <Select
                  value={form.party_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, party_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhum —</SelectItem>
                    {partyOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Descrição *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição do lançamento"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor *</Label>
                <CurrencyInputBRL
                  value={form.amount}
                  onChange={(v) => setForm({ ...form, amount: v })}
                />
              </div>
              <div>
                <Label>Data de competência *</Label>
                <Input
                  type="date"
                  value={form.competence_date}
                  onChange={(e) => setForm({ ...form, competence_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, category_id: v === "__none__" ? "" : v })}
                  disabled={form.enable_allocation}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Centro de custo</Label>
                <Select
                  value={form.cost_center_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, cost_center_id: v === "__none__" ? "" : v })}
                  disabled={form.enable_allocation}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhum —</SelectItem>
                    {catalogs.costCenters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código de referência</Label>
                <Input
                  value={form.reference_code}
                  onChange={(e) => setForm({ ...form, reference_code: e.target.value })}
                  placeholder="NF, boleto, etc."
                />
              </div>
              <div>
                <Label>Unidade de negócio</Label>
                <Input
                  value={form.business_unit}
                  onChange={(e) => setForm({ ...form, business_unit: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="enable-allocation"
                checked={form.enable_allocation}
                onCheckedChange={(c) => setForm({ ...form, enable_allocation: c })}
              />
              <Label htmlFor="enable-allocation">Habilitar rateio</Label>
            </div>
          </section>

          {/* SEÇÃO B — Condição de pagamento */}
          <section className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Condição de pagamento
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Parcelamento</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.installment_total}
                  onChange={(e) => setForm({ ...form, installment_total: e.target.value })}
                />
                {installments > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Serão criadas {installments} parcelas de {parcelaAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} cada, com vencimentos mensais.
                  </p>
                )}
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Forma de pagamento</Label>
                <Select
                  value={form.payment_method_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, payment_method_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {catalogs.paymentMethods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conta de pagamento</Label>
                <Select
                  value={form.payment_account_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, payment_account_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {bankAccounts.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.bank_name}{b.account_number ? ` · ${b.account_number}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="is-paid"
                checked={form.is_paid}
                onCheckedChange={(c) =>
                  setForm({
                    ...form,
                    is_paid: c,
                    paid_amount: c ? (totalAmount || 0).toFixed(2) : "0",
                  })
                }
              />
              <Label htmlFor="is-paid">Pago?</Label>
            </div>

            {form.is_paid && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data do pagamento</Label>
                  <Input
                    type="date"
                    value={form.paid_at}
                    onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valor pago</Label>
                  <CurrencyInputBRL
                    value={form.paid_amount}
                    onChange={(v) => setForm({ ...form, paid_amount: v })}
                  />
                </div>
              </div>
            )}
          </section>

          {/* SEÇÃO C — Rateio */}
          {form.enable_allocation && (
            <section className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Rateio
                </h3>
                <Button type="button" size="sm" variant="outline" onClick={addAllocation}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar linha
                </Button>
              </div>

              <div className="space-y-2">
                {allocations.map((a, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      {idx === 0 && <Label className="text-xs">Categoria</Label>}
                      <Select
                        value={a.category_id || "__none__"}
                        onValueChange={(v) => updateAllocation(idx, { category_id: v === "__none__" ? "" : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Nenhuma —</SelectItem>
                          {categoryOptions.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      {idx === 0 && <Label className="text-xs">Centro de custo</Label>}
                      <Select
                        value={a.cost_center_id || "__none__"}
                        onValueChange={(v) => updateAllocation(idx, { cost_center_id: v === "__none__" ? "" : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Nenhum —</SelectItem>
                          {catalogs.costCenters.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">%</Label>}
                      <Input
                        type="number"
                        step="0.01"
                        value={a.percent}
                        onChange={(e) => updateAllocation(idx, { percent: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Valor</Label>}
                      <CurrencyInputBRL
                        value={a.amount}
                        onChange={(v) => updateAllocation(idx, { amount: v })}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeAllocation(idx)}
                        disabled={allocations.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`text-xs flex justify-between px-1 ${allocValid ? "text-muted-foreground" : "text-destructive"}`}>
                <span>Soma %: {allocSum.percent.toFixed(2)}%</span>
                <span>
                  Soma R$: {allocSum.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / {totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </section>
          )}

          {/* Notas */}
          <section className="border-t pt-4">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </section>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Salvando…" : "Salvar lançamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
