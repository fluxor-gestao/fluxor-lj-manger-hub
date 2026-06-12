import { useState, useCallback } from "react";
import { useNavigate, useParams, Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CurrencyInputBRL } from "@/components/ui/currency-input-brl";
import { toast } from "sonner";
import { Upload, CheckCircle, XCircle, Link2, ArrowLeftRight, Search, ArrowLeft, Pencil, Trash2, Building2, Banknote, Plus, RotateCcw, EyeOff } from "lucide-react";
import { parseOfx, type ParsedOfxTx } from "@/lib/parseOfx";
import { parseBankStatementPdfLocal } from "@/lib/bankParsers";
import { NovoLancamentoDialog, type NovoLancamentoPrefill } from "@/components/financeiro/NovoLancamentoDialog";

type BankStatementEntry = {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  direction: string | null;
  conciliation_status: string;
};

const statusColors: Record<string, string> = {
  pendente: "bg-warning/20 text-warning border-warning/30",
  conciliado: "bg-success/20 text-success border-success/30",
  divergente: "bg-destructive/20 text-destructive border-destructive/30",
  sugerido: "bg-primary/20 text-primary border-primary/30",
  confirmado: "bg-success/20 text-success border-success/30",
  rejeitado: "bg-destructive/20 text-destructive border-destructive/30",
};

function Conciliacao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDre, setFilterDre] = useState("todos");
  const [uploadProgress, setUploadProgress] = useState<{ step: string; progress: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch bank statement entries
  const { data: statements = [] } = useQuery({
    queryKey: ["bank-statements"],
    queryFn: async () => {
      const { data } = await supabase.from("bank_statement_entries").select("*").order("transaction_date", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  // Fetch financial entries for matching
  const { data: financialEntries = [] } = useQuery({
    queryKey: ["financial-entries-conciliation"],
    queryFn: async () => {
      const { data } = await supabase.from("financial_entries").select("*").eq("conciliation_status", "pendente").order("entry_date", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  // Fetch existing matches
  const { data: matches = [] } = useQuery({
    queryKey: ["conciliation-matches"],
    queryFn: async () => {
      const { data } = await supabase.from("conciliation_matches").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Bank accounts for the "Conta de pagamento" select inside NovoLancamentoDialog
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bank_accounts")
        .select("id, bank_name, account_number, agency")
        .eq("active", true)
        .order("bank_name");
      return data ?? [];
    },
  });

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;
    setIsUploading(true);
    setUploadProgress({ step: "Upload do arquivo", progress: 10 });

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "ofx" && ext !== "pdf") {
      toast.error("Formato inválido. Envie um extrato em PDF ou OFX.");
      e.target.value = "";
      setIsUploading(false);
      setUploadProgress(null);
      return;
    }

    let transactions: ParsedOfxTx[] = [];

    try {
      if (ext === "ofx") {
        setUploadProgress({ step: "Leitura do extrato", progress: 30 });
        const text = await file.text();
        transactions = parseOfx(text);
        if (transactions.length === 0) {
          toast.error("Nenhuma transação encontrada no OFX.");
          e.target.value = "";
          setIsUploading(false);
          setUploadProgress(null);
          return;
        }
      } else {
        setUploadProgress({ step: "Leitura do extrato", progress: 20 });
        const buf = await file.arrayBuffer();
        
        setUploadProgress({ step: "Interpretação do layout", progress: 40 });
        let localText = "";
        try {
          // Passamos o buffer para evitar problemas de "detached buffer" ao reusar
          const local = await parseBankStatementPdfLocal(buf.slice(0));
          localText = local.text;
          if (local.transactions.length > 0) {
            transactions = local.transactions;
            toast.success(`Extrato lido localmente (${local.layout}) — ${local.transactions.length} lançamentos.`);
          }
        } catch (err) {
          console.warn("Falha na extração local do PDF:", err);
        }

        if (transactions.length === 0) {
          setUploadProgress({ step: "Fallback IA para interpretar extrato", progress: 60 });
          let payload: Record<string, unknown> = { fileName: file.name };
          if (localText && localText.length > 100) {
            payload.text = localText;
          } else {
            let binary = "";
            const bytes = new Uint8Array(buf);
            const chunk = 0x8000;
            for (let i = 0; i < bytes.length; i += chunk) {
              binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
            }
            payload.fileBase64 = btoa(binary);
          }

          try {
            const { data, error } = await supabase.functions.invoke("parse-bank-statement-pdf", { body: payload });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            transactions = (data?.transactions ?? []) as ParsedOfxTx[];
            if (transactions.length === 0) {
              throw new Error("Nenhuma transação reconhecida no PDF.");
            }
            if (data?.source === "manual") {
              toast.warning("Extrato lido em modo manual (IA indisponível).");
            }
          } catch (err: any) {
            const isAiCreditError = err.message?.includes("402") || err.message?.toLowerCase().includes("créditos de ia");
            toast.error(
              isAiCreditError
                ? "Créditos de IA esgotados e o PDF não pôde ser lido. Envie o extrato em OFX."
                : `Erro ao processar PDF: ${err.message}`,
            );
            e.target.value = "";
            setIsUploading(false);
            setUploadProgress(null);
            return;
          }
        }
      }

      setUploadProgress({ step: "Geração dos lançamentos", progress: 80 });
      const { data: batch, error: batchError } = await supabase.from("import_batches").insert({
        file_name: file.name,
        source_kind: "extrato_bancario",
        row_count: transactions.length,
        imported_by: user?.id,
        status: "processando" as const,
      }).select().single();

      if (batchError || !batch) throw new Error("Erro ao criar lote de importação");

      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];
        try {
          const rawAmount = Number(t.amount);
          const derivedDirection = t.direction || (rawAmount < 0 ? "saida" : "entrada");
          const { error } = await supabase.from("bank_statement_entries").insert({
            transaction_date: t.date,
            description: t.description,
            amount: Math.abs(rawAmount),
            direction: derivedDirection,
            import_batch_id: batch.id,
            raw_payload: { source: ext, index: i, raw: (t as any).raw ?? null },
          });
          if (error) throw error;
          successCount++;
        } catch (err: any) {
          errors.push(`Transação ${i + 1}: ${err.message}`);
        }
      }

      await supabase.from("import_batches").update({
        status: errors.length === 0 ? "concluido" as const : "parcial" as const,
        success_count: successCount,
        error_count: errors.length,
        error_log: errors.length > 0 ? errors : null,
      }).eq("id", batch.id);

      setUploadProgress({ step: "Concluído", progress: 100 });
      toast.success(`Importação concluída: ${successCount} transações`);
      
      // Invalidar queries para atualizar a UI sem reload
      queryClient.invalidateQueries({ queryKey: ["bank-statements"] });
      queryClient.invalidateQueries({ queryKey: ["import-batches"] });

    } catch (err: any) {
      toast.error(`Erro: ${err.message ?? err}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(null), 1000);
      e.target.value = "";
    }
  }, [user, queryClient, isUploading]);

  // Suggest matches
  const suggestMatches = useMutation({
    mutationFn: async () => {
      let matchCount = 0;
      const pendingStatements = statements.filter((s) => s.conciliation_status === "pendente");

      for (const stmt of pendingStatements) {
        const stmtDir = stmt.direction || (Number(stmt.amount) < 0 ? "saida" : "entrada");
        const stmtAmt = Math.abs(Number(stmt.amount));
        // Find financial entries with same amount and close date
        const candidates = financialEntries.filter((fe) => {
          const feAmount = stmtDir === "entrada" ? Number(fe.amount_in) : Number(fe.amount_out);
          const amountMatch = Math.abs(feAmount - stmtAmt) < 0.01;
          const dateDiff = Math.abs(new Date(fe.entry_date).getTime() - new Date(stmt.transaction_date).getTime());
          const dateMatch = dateDiff < 5 * 24 * 60 * 60 * 1000; // 5 days
          return amountMatch && dateMatch;
        });

        if (candidates.length > 0) {
          const best = candidates[0];
          let score = 50;
          if (Math.abs(new Date(best.entry_date).getTime() - new Date(stmt.transaction_date).getTime()) < 86400000) score += 30;
          if (best.movement_description && stmt.description && best.movement_description.toLowerCase().includes(stmt.description.toLowerCase().slice(0, 10))) score += 20;

          await supabase.from("conciliation_matches").insert({
            bank_statement_entry_id: stmt.id,
            financial_entry_id: best.id,
            match_score: Math.min(score, 100),
            match_type: "automatico" as const,
            status: "sugerido" as const,
          });
          matchCount++;
        }
      }
      return matchCount;
    },
    onSuccess: (count) => {
      toast.success(`${count} sugestões de conciliação geradas`);
      queryClient.invalidateQueries({ queryKey: ["conciliation-matches"] });
    },
  });

  // Confirm match
  const confirmMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const match = matches.find((m) => m.id === matchId);
      if (!match) throw new Error("Match não encontrado");

      await supabase.from("conciliation_matches").update({ status: "confirmado" as const, confirmed_by: user?.id, confirmed_at: new Date().toISOString() }).eq("id", matchId);
      await supabase.from("bank_statement_entries").update({ conciliation_status: "conciliado" as const }).eq("id", match.bank_statement_entry_id);
      await supabase.from("financial_entries").update({ conciliation_status: "conciliado" as const }).eq("id", match.financial_entry_id);
    },
    onSuccess: () => {
      toast.success("Conciliação confirmada");
      queryClient.invalidateQueries();
    },
  });

  const rejectMatch = useMutation({
    mutationFn: async (matchId: string) => {
      await supabase.from("conciliation_matches").update({ status: "rejeitado" as const }).eq("id", matchId);
    },
    onSuccess: () => {
      toast.success("Match rejeitado");
      queryClient.invalidateQueries({ queryKey: ["conciliation-matches"] });
    },
  });

  // Edit / delete state
  const [editingEntry, setEditingEntry] = useState<BankStatementEntry | null>(null);
  const [editForm, setEditForm] = useState({ transaction_date: "", description: "", direction: "entrada", amount: "0.00" });
  const [deletingEntry, setDeletingEntry] = useState<BankStatementEntry | null>(null);

  const openEdit = (s: any) => {
    setEditingEntry(s);
    setEditForm({
      transaction_date: s.transaction_date ?? "",
      description: s.description ?? "",
      direction: s.direction ?? "entrada",
      amount: Number(s.amount ?? 0).toFixed(2),
    });
  };

  const updateEntry = useMutation({
    mutationFn: async () => {
      if (!editingEntry) throw new Error("Sem lançamento selecionado");
      const { error } = await supabase
        .from("bank_statement_entries")
        .update({
          transaction_date: editForm.transaction_date,
          description: editForm.description,
          direction: editForm.direction,
          amount: Number(editForm.amount),
        })
        .eq("id", editingEntry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento atualizado");
      setEditingEntry(null);
      queryClient.invalidateQueries({ queryKey: ["bank-statements"] });
    },
    onError: (err: any) => toast.error(`Erro ao atualizar: ${err.message ?? err}`),
  });

  const deleteEntry = useMutation({
    mutationFn: async (entry: BankStatementEntry) => {
      if (entry.conciliation_status === "conciliado") {
        throw new Error("Lançamento conciliado. Rejeite a conciliação antes de excluir.");
      }
      // Remove related matches first
      const { error: mErr } = await supabase
        .from("conciliation_matches")
        .delete()
        .eq("bank_statement_entry_id", entry.id);
      if (mErr) throw mErr;
      const { error } = await supabase.from("bank_statement_entries").delete().eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento excluído");
      setDeletingEntry(null);
      queryClient.invalidateQueries({ queryKey: ["bank-statements"] });
      queryClient.invalidateQueries({ queryKey: ["conciliation-matches"] });
    },
    onError: (err: any) => {
      toast.error(err.message ?? "Erro ao excluir");
      setDeletingEntry(null);
    },
  });

  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const deleteAllEntries = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) throw new Error("Nenhum lançamento para excluir.");
      const { error: mErr } = await supabase
        .from("conciliation_matches")
        .delete()
        .in("bank_statement_entry_id", ids);
      if (mErr) throw mErr;
      const { error } = await supabase
        .from("bank_statement_entries")
        .delete()
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} lançamento(s) excluído(s)`);
      setConfirmDeleteAll(false);
      queryClient.invalidateQueries({ queryKey: ["bank-statements"] });
      queryClient.invalidateQueries({ queryKey: ["conciliation-matches"] });
    },
    onError: (err: any) => {
      toast.error(err.message ?? "Erro ao excluir lançamentos");
      setConfirmDeleteAll(false);
    },
  });

  // ---- Paired layout: filters, helpers, mutations ----
  const [pairFilter, setPairFilter] = useState<string>("todos");
  const [searchTarget, setSearchTarget] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [createTarget, setCreateTarget] = useState<any>(null);
  const [createPrefill, setCreatePrefill] = useState<NovoLancamentoPrefill | undefined>(undefined);

  const openSearch = (stmt: any) => {
    setSearchTarget(stmt);
    setSearchTerm("");
  };
  const openCreate = (stmt: any) => {
    const isEntrada =
      stmt.direction === "entrada" || (stmt.direction == null && Number(stmt.amount) >= 0);
    const stmtDate: string = stmt.transaction_date ?? "";
    const amt = Math.abs(Number(stmt.amount ?? 0)).toFixed(2);
    setCreateTarget(stmt);
    setCreatePrefill({
      entry_type: isEntrada ? "receita" : "despesa",
      description: stmt.description ?? "",
      amount: amt,
      competence_date: stmtDate,
      due_date: stmtDate,
      payment_account_id: stmt.bank_account_id ?? "",
      is_paid: true,
      paid_at: stmtDate,
      paid_amount: amt,
    });
  };

  const weekday = (iso: string) => {
    try {
      return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long" });
    } catch {
      return "";
    }
  };

  // In-memory automatic suggestion (does not persist)
  const autoSuggest = (stmt: any) => {
    const stmtDir = stmt.direction || (Number(stmt.amount) < 0 ? "saida" : "entrada");
    const stmtAmt = Math.abs(Number(stmt.amount));
    const candidates = financialEntries.filter((fe) => {
      const feAmount = stmtDir === "entrada" ? Number(fe.amount_in) : Number(fe.amount_out);
      const amountMatch = Math.abs(feAmount - stmtAmt) < 0.01;
      const dateDiff = Math.abs(new Date(fe.entry_date).getTime() - new Date(stmt.transaction_date).getTime());
      const dateMatch = dateDiff < 5 * 24 * 60 * 60 * 1000;
      return amountMatch && dateMatch;
    });
    return candidates[0] ?? null;
  };

  // Score 0-100 do par sugerido
  const matchScore = (stmt: any, fe: any | null): number => {
    if (!fe) return 0;
    const stmtDir = stmt.direction || (Number(stmt.amount) < 0 ? "saida" : "entrada");
    const stmtAmt = Math.abs(Number(stmt.amount));
    const feAmount = stmtDir === "entrada" ? Number(fe.amount_in) : Number(fe.amount_out);
    let score = 0;
    if (Math.abs(feAmount - stmtAmt) < 0.01) score += 60;
    const dateDiff = Math.abs(new Date(fe.entry_date).getTime() - new Date(stmt.transaction_date).getTime());
    if (dateDiff < 86400000) score += 25;
    else if (dateDiff < 3 * 86400000) score += 15;
    else if (dateDiff < 5 * 86400000) score += 8;
    const desc = (fe.movement_description || "").toLowerCase();
    const sd = (stmt.description || "").toLowerCase().slice(0, 12);
    if (sd && desc.includes(sd)) score += 15;
    return Math.min(score, 100);
  };

  // Marcar lançamento como transferência interna
  const markAsTransfer = useMutation({
    mutationFn: async (stmt: any) => {
      const isEntrada = (stmt.direction || (Number(stmt.amount) < 0 ? "saida" : "entrada")) === "entrada";
      const amt = Math.abs(Number(stmt.amount));
      const { data: fe, error } = await supabase
        .from("financial_entries")
        .insert({
          entry_date: stmt.transaction_date,
          movement_description: `Transferência interna — ${stmt.description ?? ""}`.trim(),
          amount_in: isEntrada ? amt : 0,
          amount_out: isEntrada ? 0 : amt,
          entry_type: "transferencia" as any,
          source_type: "manual" as const,
          conciliation_status: "conciliado" as const,
          user_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("conciliation_matches").insert({
        bank_statement_entry_id: stmt.id,
        financial_entry_id: fe.id,
        match_score: 100,
        match_type: "manual" as const,
        status: "confirmado" as const,
        confirmed_by: user?.id,
        confirmed_at: new Date().toISOString(),
      });
      await supabase.from("bank_statement_entries").update({ conciliation_status: "conciliado" as const }).eq("id", stmt.id);
    },
    onSuccess: () => {
      toast.success("Marcado como transferência interna");
      queryClient.invalidateQueries();
    },
    onError: (e: any) => toast.error(`Erro: ${e.message ?? e}`),
  });

  // Pair conciliation: create or update match + flip statuses
  const conciliatePair = useMutation({
    mutationFn: async ({ stmt, fe, existingMatchId }: { stmt: any; fe: any; existingMatchId?: string }) => {
      const stmtDir = stmt.direction || (Number(stmt.amount) < 0 ? "saida" : "entrada");
      const stmtAmt = Math.abs(Number(stmt.amount));
      const feAmount = stmtDir === "entrada" ? Number(fe.amount_in) : Number(fe.amount_out);
      const feHasOpposite = stmtDir === "entrada" ? Number(fe.amount_out) > 0 : Number(fe.amount_in) > 0;

      // FX comparison: bank value (BRL) vs total_brl expected
      const feCurrency: string = fe.currency || "BRL";
      const feOriginal = Number(fe.original_amount ?? feAmount ?? 0);
      const expectedBrl = Number(fe.total_brl ?? feAmount ?? 0);
      const brlDiff = Math.abs(stmtAmt - expectedBrl);
      const isFxEntry = feCurrency !== "BRL";
      const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

      const feUpdate: Record<string, any> = { conciliation_status: "conciliado" as const };

      if (feHasOpposite || feAmount === 0) {
        const sideLabel = stmtDir === "entrada" ? "entrada" : "saída";
        const feSide = Number(fe.amount_in) > 0 ? "entrada" : "saída";
        const ok = window.confirm(
          `Divergência de direção detectada:\n\n` +
            `• Banco: ${sideLabel} de ${fmtBRL(stmtAmt)}\n` +
            `• Lançamento interno: ${feSide}\n\n` +
            `Conciliar mesmo assim?`,
        );
        if (!ok) throw new Error("Conciliação cancelada por divergência.");
      } else if (brlDiff >= 0.01 && isFxEntry && feOriginal > 0) {
        // Variação cambial: recalcula taxa, marca status especial
        const newRate = stmtAmt / feOriginal;
        feUpdate.exchange_rate = Number(newRate.toFixed(6));
        feUpdate.total_brl = stmtAmt;
        feUpdate.fx_variation = stmtAmt - expectedBrl;
        feUpdate.fx_status = "com_variacao_cambial";
        toast.info(`Variação cambial registrada (taxa ${newRate.toFixed(4)})`);
      }

      // --- Pagamento parcial / total / excedente ---
      const paidPrev = Number(fe.paid_amount ?? 0);
      const baseTotal = feAmount || expectedBrl || 0;
      const openPrev = Number(fe.open_amount ?? Math.max(0, baseTotal - paidPrev));
      let appliedAmount = stmtAmt;
      let excedente = 0;
      let nextStatus: "pago" | "parcial" = "pago";

      if (Math.abs(stmtAmt - openPrev) < 0.01) {
        appliedAmount = openPrev;
        nextStatus = "pago";
      } else if (stmtAmt < openPrev) {
        appliedAmount = stmtAmt;
        nextStatus = "parcial";
      } else {
        const ok = window.confirm(
          `Valor do banco (${fmtBRL(stmtAmt)}) é maior que o saldo em aberto (${fmtBRL(openPrev)}).\n\n` +
            `Registrar como pago e gerar excedente de ${fmtBRL(stmtAmt - openPrev)}?`,
        );
        if (!ok) throw new Error("Conciliação cancelada por divergência de valor.");
        appliedAmount = openPrev;
        excedente = stmtAmt - openPrev;
        nextStatus = "pago";
      }

      feUpdate.paid_amount = Number((paidPrev + appliedAmount).toFixed(2));
      feUpdate.open_amount = Number(Math.max(0, openPrev - appliedAmount).toFixed(2));
      feUpdate.payment_status = nextStatus;

      // Proteção: Garante que o valor da baixa seja positivo para evitar erro no banco
      const finalPaymentAmount = Math.max(0.01, appliedAmount);
      if (nextStatus === "pago" || !fe.paid_at) {
        feUpdate.paid_at = stmt.transaction_date;
      }

      let matchId = existingMatchId;
      if (!matchId) {
        const { data, error } = await supabase
          .from("conciliation_matches")
          .insert({
            bank_statement_entry_id: stmt.id,
            financial_entry_id: fe.id,
            match_score: 100,
            match_type: "manual" as const,
            status: "confirmado" as const,
            confirmed_by: user?.id,
            confirmed_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        matchId = data.id;
      } else {
        const { error } = await supabase
          .from("conciliation_matches")
          .update({
            financial_entry_id: fe.id,
            status: "confirmado" as const,
            confirmed_by: user?.id,
            confirmed_at: new Date().toISOString(),
          })
          .eq("id", matchId);
        if (error) throw error;
      }
      await supabase.from("bank_statement_entries").update({ conciliation_status: "conciliado" as const }).eq("id", stmt.id);
      await supabase.from("financial_entries").update(feUpdate as any).eq("id", fe.id);

      // Registra a baixa (histórico imutável)
      const { error: payErr } = await supabase.from("financial_payments").insert({
        financial_entry_id: fe.id,
        bank_statement_entry_id: stmt.id,
        conciliation_match_id: matchId,
        amount: finalPaymentAmount,
        paid_at: stmt.transaction_date,
        payment_method_id: fe.payment_method_id ?? null,
        bank_account_id: stmt.bank_account_id ?? fe.payment_account_id ?? fe.bank_account_id ?? null,
        notes: excedente > 0 ? `Excedente recebido: ${fmtBRL(excedente)}` : null,
        created_by: user?.id ?? null,
      });
      if (payErr) throw payErr;

      return { status: nextStatus, openAfter: feUpdate.open_amount as number };
    },
    onSuccess: (res) => {
      if (res?.status === "parcial") {
        const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(res.openAfter);
        toast.success(`Baixa parcial registrada — saldo: ${fmt}`);
      } else {
        toast.success("Conciliado!");
      }
      queryClient.invalidateQueries();
    },
    onError: (e: any) => toast.error(`Erro: ${e.message ?? e}`),
  });

  // Undo conciliation — preserva demais baixas; remove apenas a deste match e recalcula saldo
  const undoMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const m = matches.find((x) => x.id === matchId);
      if (!m) throw new Error("Match não encontrado");

      const { data: fe } = await supabase
        .from("financial_entries")
        .select("*")
        .eq("id", m.financial_entry_id)
        .single();
      const { data: otherPayments } = await supabase
        .from("financial_payments")
        .select("amount")
        .eq("financial_entry_id", m.financial_entry_id)
        .neq("conciliation_match_id", matchId);

      const totalPaid = (otherPayments ?? []).reduce((s, p: any) => s + Number(p.amount), 0);
      const feAmount = Number(fe?.amount_in ?? 0) > 0 ? Number(fe?.amount_in) : Number(fe?.amount_out ?? 0);
      const baseTotal = Number(fe?.total_brl ?? feAmount ?? 0);
      const openAfter = Math.max(0, baseTotal - totalPaid);
      const today = new Date().toISOString().slice(0, 10);
      let status: "pago" | "parcial" | "aberto" | "vencido";
      if (openAfter <= 0.0049) status = "pago";
      else if (totalPaid > 0) status = "parcial";
      else if (fe?.due_date && fe.due_date < today) status = "vencido";
      else status = "aberto";

      await supabase.from("financial_payments").delete().eq("conciliation_match_id", matchId);
      await supabase.from("conciliation_matches").delete().eq("id", matchId);
      await supabase.from("bank_statement_entries").update({ conciliation_status: "pendente" as const }).eq("id", m.bank_statement_entry_id);
      await supabase.from("financial_entries").update({
        conciliation_status: totalPaid > 0 ? ("conciliado" as const) : ("pendente" as const),
        paid_amount: Number(totalPaid.toFixed(2)),
        open_amount: Number(openAfter.toFixed(2)),
        payment_status: status,
      }).eq("id", m.financial_entry_id);
    },
    onSuccess: () => {
      toast.success("Conciliação desfeita");
      queryClient.invalidateQueries();
    },
    onError: (e: any) => toast.error(`Erro: ${e.message ?? e}`),
  });

  // Mark statement as ignored (uses 'divergente' status)
  const ignoreEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_statement_entries").update({ conciliation_status: "divergente" as const }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento ignorado");
      queryClient.invalidateQueries({ queryKey: ["bank-statements"] });
    },
  });

  // After NovoLancamentoDialog creates the entry, fetch it and pair with the bank statement
  const handleCreatedAndPair = useCallback(async (firstEntryId?: string) => {
    if (!firstEntryId || !createTarget) {
      setCreateTarget(null);
      return;
    }
    try {
      const { data: fe, error } = await supabase
        .from("financial_entries")
        .select("*")
        .eq("id", firstEntryId)
        .single();
      if (error) throw error;
      await conciliatePair.mutateAsync({ stmt: createTarget, fe });
    } catch (e: any) {
      toast.error(`Erro ao conciliar: ${e.message ?? e}`);
    } finally {
      setCreateTarget(null);
      setCreatePrefill(undefined);
    }
  }, [createTarget]);

  const conciliadoCount = statements.filter((s) => s.conciliation_status === "conciliado").length;
  const pendenteCount = statements.filter((s) => s.conciliation_status === "pendente").length;
  const totalEntradas = statements.filter((s) => s.direction === "entrada").reduce((s, e) => s + Number(e.amount), 0);
  const totalSaidas = statements.filter((s) => s.direction === "saida").reduce((s, e) => s + Number(e.amount), 0);
  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  const suggestedMatches = matches.filter((m) => m.status === "sugerido");

  const filteredStatements = statements.filter((s) => {
    if (pairFilter !== "todos" && s.conciliation_status !== pairFilter) return false;
    if (search && !s.description?.toLowerCase().includes(search.toLowerCase())) return false;
    
    const persistedMatch = matches.find(m => m.bank_statement_entry_id === s.id && m.status === "confirmado");
    const matchedFE = persistedMatch ? financialEntries.find(f => f.id === persistedMatch.financial_entry_id) : null;
    
    if (filterDre === "sem_dre") {
      if (matchedFE && (matchedFE.dre_group || matchedFE.account_category_id)) return false;
    } else if (filterDre !== "todos") {
      if (!matchedFE || matchedFE.dre_group !== filterDre) return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Conciliação Bancária</h1>
          <p className="text-muted-foreground mt-1">Compare extratos com lançamentos internos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div className="flex flex-col gap-1">
            <label className="cursor-pointer">
              <Button variant="outline" asChild disabled={isUploading}>
                <span>
                  {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {isUploading ? "Processando..." : "Upload Extrato (PDF ou OFX)"}
                </span>
              </Button>
              <input type="file" accept=".ofx,.pdf,application/pdf" className="hidden" onChange={handleUpload} disabled={isUploading} />
            </label>
            {uploadProgress && (
              <div className="w-full space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{uploadProgress.step}</span>
                  <span>{uploadProgress.progress}%</span>
                </div>
                <Progress value={uploadProgress.progress} className="h-1" />
              </div>
            )}
          </div>
          <Button onClick={() => suggestMatches.mutate()} disabled={suggestMatches.isPending || isUploading}>
            <Link2 className="h-4 w-4 mr-2" /> Sugerir Conciliações
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold font-display text-success">{conciliadoCount}</p>
          <p className="text-xs text-muted-foreground">Conciliado</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold font-display text-warning">{pendenteCount}</p>
          <p className="text-xs text-muted-foreground">Pendente</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold font-display">{suggestedMatches.length}</p>
          <p className="text-xs text-muted-foreground">Sugestões</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold font-display text-success">{fmt(totalEntradas)}</p>
          <p className="text-xs text-muted-foreground">Entradas</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold font-display text-destructive">{fmt(totalSaidas)}</p>
          <p className="text-xs text-muted-foreground">Saídas</p>
        </CardContent></Card>
      </div>

      {/* Paired conciliation layout (estilo Conta Azul) */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" /> Conciliação por par
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={pairFilter} onValueChange={setPairFilter}>
              <SelectTrigger className="w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="conciliado">Conciliados</SelectItem>
                <SelectItem value="divergente">Ignorados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDre} onValueChange={setFilterDre}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Filtro DRE" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos (DRE)</SelectItem>
                <SelectItem value="sem_dre">Sem DRE</SelectItem>
                {[
                  "Despesas com Impostos", "Encargos Sociais", "Despesas com Pessoal",
                  "Despesas Administrativas", "Despesas Financeiras", "Investimentos no Patrimônio",
                  "Ressarcimentos", "Diretoria"
                ].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setConfirmDeleteAll(true)}
              disabled={filteredStatements.filter((s) => s.conciliation_status !== "conciliado").length === 0}
              title="Excluir todos os lançamentos visíveis (exceto conciliados)"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Excluir todos
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header das colunas (desktop) */}
          <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] gap-4 px-2 text-xs font-semibold text-muted-foreground uppercase">
            <div className="flex items-center gap-2"><Banknote className="h-4 w-4" /> Lançamentos do banco</div>
            <div className="w-[120px] text-center">Ação</div>
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Lançamentos internos</div>
          </div>

          {filteredStatements.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum lançamento encontrado. Faça upload de um extrato (PDF ou OFX) para começar.
            </div>
          ) : (
            filteredStatements.map((s) => {
              const persistedMatch = matches.find(
                (m) => m.bank_statement_entry_id === s.id && (m.status === "sugerido" || m.status === "confirmado"),
              );
              const matchedFE = persistedMatch
                ? financialEntries.find((f) => f.id === persistedMatch.financial_entry_id)
                : autoSuggest(s);
              const isConciliado = s.conciliation_status === "conciliado";
              const isIgnorado = s.conciliation_status === "divergente";

              return (
                <div
                  key={s.id}
                  className={`grid lg:grid-cols-[1fr_auto_1fr] gap-3 lg:gap-4 items-stretch rounded-lg border p-3 ${
                    isConciliado ? "bg-success/5 border-success/30" : isIgnorado ? "bg-muted/30" : "bg-background"
                  }`}
                >
                  {/* Card extrato */}
                  <div className="rounded-md border bg-card p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        {s.transaction_date} · {weekday(s.transaction_date)}
                      </div>
                      <div className={`text-sm font-bold ${s.direction === "entrada" ? "text-success" : "text-destructive"}`}>
                        {s.direction === "saida" ? "-" : ""}{fmt(Number(s.amount))}
                      </div>
                    </div>
                    <div className="text-sm font-medium leading-snug">{s.description || "(sem descrição)"}</div>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <Badge variant="outline" className={statusColors[s.conciliation_status] || ""}>
                        {s.conciliation_status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeletingEntry(s as BankStatementEntry)} className="text-destructive" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {!isConciliado && !isIgnorado && (
                          <Button size="sm" variant="ghost" onClick={() => ignoreEntry.mutate(s.id)} title="Ignorar">
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botão central */}
                  <div className="flex lg:flex-col items-center justify-center gap-2 lg:w-[120px]">
                    {!isConciliado && matchedFE && (() => {
                      const sc = matchScore(s, matchedFE);
                      const cls = sc >= 100
                        ? "bg-success/15 text-success border-success/30"
                        : sc >= 60
                        ? "bg-warning/15 text-warning border-warning/30"
                        : "bg-muted text-muted-foreground border-border";
                      const label = sc >= 100 ? "Match Exato" : sc >= 60 ? "Match Provável" : "Sem sugestão";
                      return (
                        <Badge variant="outline" className={`${cls} text-[10px]`}>
                          {label} · {sc}%
                        </Badge>
                      );
                    })()}
                    {isConciliado ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => persistedMatch && undoMatch.mutate(persistedMatch.id)}
                        disabled={!persistedMatch || undoMatch.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" /> Desfazer
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => matchedFE && conciliatePair.mutate({ stmt: s, fe: matchedFE, existingMatchId: persistedMatch?.id })}
                          disabled={!matchedFE || conciliatePair.isPending}
                          title={matchedFE ? "Conciliar par" : "Selecione um lançamento à direita"}
                        >
                          <Link2 className="h-4 w-4 mr-1" /> Conciliar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-primary border-primary/30 hover:bg-primary/10"
                          onClick={() => markAsTransfer.mutate(s)}
                          disabled={markAsTransfer.isPending}
                          title="Marcar como transferência interna"
                        >
                          <ArrowLeftRight className="h-4 w-4 mr-1" /> Transf.
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Card lançamento interno */}
                  <div className={`rounded-md border p-3 flex flex-col gap-2 ${matchedFE ? "bg-card" : "bg-muted/30 border-dashed"}`}>
                    {matchedFE ? (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs text-muted-foreground">
                            {matchedFE.entry_date} {matchedFE.business_unit ? `· ${matchedFE.business_unit}` : ""}
                          </div>
                          <div className="text-sm font-bold">
                            {fmt(Number(matchedFE.amount_in || matchedFE.amount_out || 0))}
                          </div>
                        </div>
                        <div className="text-sm font-medium leading-snug">
                          {matchedFE.movement_description || "(sem descrição)"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {matchedFE.counterparty_name || "—"}
                          {matchedFE.movement_account ? ` · ${matchedFE.movement_account}` : ""}
                        </div>
                        {!isConciliado && (
                          <div className="flex justify-end gap-1 mt-auto pt-2">
                            <Button size="sm" variant="ghost" onClick={() => openSearch(s)}>
                              Trocar
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center gap-2 py-4">
                        <p className="text-xs text-muted-foreground">Sem candidato automático</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openSearch(s)}>
                            <Search className="h-4 w-4 mr-1" /> Buscar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openCreate(s)}>
                            <Plus className="h-4 w-4 mr-1" /> Novo
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(o) => !o && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar lançamento do extrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Data</Label>
              <Input id="edit-date" type="date" value={editForm.transaction_date} onChange={(e) => setEditForm((f) => ({ ...f, transaction_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Descrição</Label>
              <Input id="edit-desc" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Direção</Label>
              <Select value={editForm.direction} onValueChange={(v) => setEditForm((f) => ({ ...f, direction: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <CurrencyInputBRL value={editForm.amount} onChange={(v) => setEditForm((f) => ({ ...f, amount: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancelar</Button>
            <Button onClick={() => updateEntry.mutate()} disabled={updateEntry.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingEntry} onOpenChange={(o) => !o && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente o lançamento do extrato e quaisquer sugestões de conciliação relacionadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deletingEntry) deleteEntry.mutate(deletingEntry);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete-all confirmation */}
      <AlertDialog open={confirmDeleteAll} onOpenChange={(o) => !o && setConfirmDeleteAll(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todos os lançamentos visíveis?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const elig = filteredStatements.filter((s) => s.conciliation_status !== "conciliado");
                const skipped = filteredStatements.length - elig.length;
                return (
                  <>
                    Esta ação remove permanentemente <strong>{elig.length}</strong> lançamento(s) do extrato e quaisquer sugestões de conciliação relacionadas.
                    {skipped > 0 && (
                      <> {skipped} lançamento(s) já conciliado(s) serão preservados — rejeite a conciliação antes para excluí-los.</>
                    )}
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                const ids = filteredStatements
                  .filter((s) => s.conciliation_status !== "conciliado")
                  .map((s) => s.id);
                deleteAllEntries.mutate(ids);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search financial entry dialog */}
      <Dialog open={!!searchTarget} onOpenChange={(o) => !o && setSearchTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buscar lançamento interno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Buscar por descrição, fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            <div className="max-h-[400px] overflow-y-auto divide-y border rounded-md">
              {financialEntries
                .filter((fe) => {
                  if (!searchTerm) return true;
                  const t = searchTerm.toLowerCase();
                  return (
                    fe.movement_description?.toLowerCase().includes(t) ||
                    fe.counterparty_name?.toLowerCase().includes(t) ||
                    String(fe.amount_in ?? "").includes(t) ||
                    String(fe.amount_out ?? "").includes(t)
                  );
                })
                .slice(0, 50)
                .map((fe) => (
                  <button
                    key={fe.id}
                    className="w-full text-left p-3 hover:bg-accent transition-colors"
                    onClick={() => {
                      if (searchTarget) {
                        conciliatePair.mutate({ stmt: searchTarget, fe });
                        setSearchTarget(null);
                      }
                    }}
                  >
                    <div className="flex justify-between gap-2">
                      <div className="text-sm font-medium">{fe.movement_description || "(sem descrição)"}</div>
                      <div className="text-sm font-bold">{fmt(Number(fe.amount_in || fe.amount_out || 0))}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {fe.entry_date} · {fe.counterparty_name || "—"} {fe.business_unit ? `· ${fe.business_unit}` : ""}
                    </div>
                  </button>
                ))}
              {financialEntries.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">Nenhum lançamento pendente.</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create new financial entry — formulário completo + conciliação automática */}
      <NovoLancamentoDialog
        open={!!createTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCreateTarget(null);
            setCreatePrefill(undefined);
          }
        }}
        bankAccounts={bankAccounts as any}
        prefill={createPrefill}
        title="Novo lançamento financeiro (conciliação)"
        submitLabel="Salvar e conciliar"
        onCreated={handleCreatedAndPair}
      />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/conciliacao")({
  component: Conciliacao,
});
