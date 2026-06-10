import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, X, Clock, Mail } from "lucide-react";
import type { CobrancaRow } from "./CobrancaDetailSheet";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtDateBR = (iso: string | null | undefined) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—";

export function LembretePreviewDialog({
  row, open, onOpenChange,
}: {
  row: CobrancaRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  
  const cliente = row?.client?.name || row?.counterparty_name || "Cliente";
  const openAmount = Number(row?.open_amount ?? 0);
  const invoiceNumber = row ? `FAT-${row.id.slice(0, 8).toUpperCase()}` : "";
  const dueDate = row ? fmtDateBR(row.due_date) : "";
  const invoiceLink = `https://ljmanager.fluxorbi.com/fatura/${row?.id}`;

  const defaultMsg = useMemo(() => {
    if (!row) return "";
    return [
      `Olá, ${cliente}.`,
      "",
      `Este é um lembrete amigável referente à cobrança ${invoiceNumber}, com vencimento em ${dueDate}.`,
      "",
      `Valor em aberto: ${fmt(openAmount)}.`,
      "",
      "Caso o pagamento já tenha sido realizado, favor desconsiderar esta mensagem.",
      "",
      "Acesse a fatura pelo link abaixo:",
      invoiceLink,
      "",
      "Equipe LJ Manager",
    ].join("\n");
  }, [row, cliente, invoiceNumber, dueDate, openAmount, invoiceLink]);

  const [message, setMessage] = useState(defaultMsg);

  useEffect(() => {
    if (open) setMessage(defaultMsg);
  }, [open, defaultMsg]);

  if (!row) return null;

  const handleSend = async () => {
    let targetEmail = (row as any).client?.email;
    
    if (!targetEmail && row.client_id) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("email")
        .eq("id", row.client_id)
        .single();
      targetEmail = clientData?.email;
    }

    if (!targetEmail) {
      toast.error("E-mail do cliente não encontrado", {
        description: "Configure o e-mail no cadastro do cliente antes de enviar."
      });
      return;
    }

    setIsSending(true);
    try {
      // Usar a mesma Edge Function de envio de e-mail
      const { error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          entry_id: row.id,
          to: targetEmail,
          subject: `Lembrete de Cobrança - ${invoiceNumber}`,
          message_text: message,
          invoice_number: invoiceNumber,
          open_amount: fmt(openAmount),
          due_date: dueDate,
        },
      });

      if (error) throw error;

      // Registrar histórico e atualizar contadores
      const { data: entry } = await supabase.from("financial_entries").select("notes").eq("id", row.id).single();
      const now = new Date();
      const logEntry = `\n[Sistema] Lembrete enviado em ${now.toLocaleString('pt-BR')} para ${targetEmail}.`;
      
      // Incrementar contador de lembretes se houver campo ou via notas
      // Como as regras pedem para atualizar "Lembrete sugerido" para "Lembrete enviado" (na esteira visual),
      // e exibir data do último lembrete, vamos salvar isso nas notas de forma estruturada ou apenas no log.
      // O componente CobrancaDetailSheet reconstrói a esteira dinamicamente.
      
      await supabase.from("financial_entries").update({
        notes: (entry?.notes || "") + logEntry,
        updated_at: now.toISOString(),
      }).eq("id", row.id);

      toast.success("Lembrete enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["contas-a-receber"] });
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error sending reminder:", err);
      toast.error("Erro ao enviar lembrete", {
        description: err.message || "Ocorreu um erro inesperado."
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Preview do Lembrete
          </DialogTitle>
          <DialogDescription>
            Revise a mensagem amigável que será enviada ao cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg border text-sm">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Cliente</p>
              <p className="font-medium truncate">{cliente}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Vencimento</p>
              <p className="font-medium">{dueDate}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Valor em Aberto</p>
              <p className="font-medium">{fmt(openAmount)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mensagem do E-mail
            </p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className="resize-none font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSending}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="min-w-[140px]">
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" /> Enviar Lembrete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
