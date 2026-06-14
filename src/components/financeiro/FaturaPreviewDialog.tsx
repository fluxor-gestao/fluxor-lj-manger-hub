import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Copy, Send, Download, X, CreditCard, Building2, Loader2, Info, User, Mail, Phone, CheckCircle2 } from "lucide-react";
import { useFinanceiroCatalogs } from "@/hooks/useFinanceiroCatalogs";
import logo from "@/assets/logo.svg";
import type { CobrancaRow } from "./CobrancaDetailSheet";

import { formatDevisCode, formatMovementDescription } from "@/lib/formatDevis";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtDateBR = (iso: string | null | undefined) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—";

const COMPANY = {
  name: "LJ Manager",
  tagline: "Gestão financeira e operacional",
  email: "financeiro@ljmanager.com.br",
  site: "ljmanager.fluxorbi.com",
};

function statusOf(r: CobrancaRow) {
  const today = new Date().toISOString().slice(0, 10);
  if (r.payment_status === "pago" || Number(r.open_amount ?? 0) <= 0.0049) return "pago";
  if (Number(r.paid_amount ?? 0) > 0 && Number(r.open_amount ?? 0) > 0) return "parcial";
  if (r.due_date && r.due_date < today) return "vencido";
  return "aberto";
}

const statusBadge: Record<string, string> = {
  pago: "bg-success/15 text-success border-success/30",
  parcial: "bg-warning/15 text-warning border-warning/30",
  vencido: "bg-destructive/15 text-destructive border-destructive/30",
  aberto: "bg-muted text-muted-foreground border-border",
};
const statusLabel: Record<string, string> = {
  pago: "Pago", parcial: "Parcial", vencido: "Vencido", aberto: "Em aberto",
};

export function FaturaPreviewDialog({
  row, open, onOpenChange,
}: {
  row: CobrancaRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const catalogs = useFinanceiroCatalogs();
  const [isSending, setIsSending] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadingRecipient, setLoadingRecipient] = useState(false);
  const [recipient, setRecipient] = useState<{ name: string; email: string; phone: string; document: string }>({
    name: "", email: "", phone: "", document: "",
  });

  const cliente = row?.client?.name || row?.counterparty_name || "Cliente";
  const total = Number(row?.total_brl ?? row?.amount_in ?? 0);
  const paid = Number(row?.paid_amount ?? 0);
  const open_ = Number(row?.open_amount ?? Math.max(0, total - paid));
  const st = row ? statusOf(row) : "aberto";

  const selectedMethod = useMemo(() => 
    catalogs.paymentMethods.find(m => m.id === selectedMethodId),
    [catalogs.paymentMethods, selectedMethodId]
  );

  const selectedAccount = useMemo(() => 
    catalogs.financialAccounts.find(a => a.id === selectedAccountId),
    [catalogs.financialAccounts, selectedAccountId]
  );

  // Auto-fill account based on business unit
  useEffect(() => {
    if (open && row && catalogs.financialAccounts.length > 0) {
      const bu = (row as any).business_unit;
      if (bu) {
        const account = catalogs.financialAccounts.find(a => a.business_unit === bu);
        if (account && !selectedAccountId) {
          setSelectedAccountId(account.id);
        }
      }
    }
  }, [open, row, catalogs.financialAccounts, selectedAccountId]);

  // Set default method if none selected
  useEffect(() => {
    if (open && catalogs.paymentMethods.length > 0 && !selectedMethodId) {
      const pix = catalogs.paymentMethods.find(m => m.name.toLowerCase() === "pix");
      if (pix) setSelectedMethodId(pix.id);
      else setSelectedMethodId(catalogs.paymentMethods[0].id);
    }
  }, [open, catalogs.paymentMethods, selectedMethodId]);

  const defaultMsg = useMemo(() => {
    if (!row) return "";
    return [
      `Olá, ${cliente}!`,
      "",
      `Segue a fatura referente a "${formatMovementDescription(row.movement_description, row.devis_number, row.devis_id)}".`,
      `Valor: ${fmt(open_)}`,
      `Vencimento: ${fmtDateBR(row.due_date)}`,
      "",
      "Em caso de dúvidas, estamos à disposição.",
      "",
      `Equipe ${COMPANY.name}`,
    ].join("\n");
  }, [row, cliente, open_]);

  const [message, setMessage] = useState(defaultMsg);

  // Reinicia mensagem quando troca de cobrança
  useMemo(() => { setMessage(defaultMsg); }, [defaultMsg]);

  if (!row) return null;

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Mensagem copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const invoiceNumber = `FAT-${row.id.slice(0, 8).toUpperCase()}`;

  const openConfirmDialog = async () => {
    if (!row) return;
    setLoadingRecipient(true);
    setConfirmOpen(true);
    try {
      let clientId = row.client_id as string | null | undefined;
      let name = (row as any).client?.name || row.counterparty_name || "";
      let email = (row as any).client?.email || "";
      let phone = (row as any).client?.phone || "";
      let document = (row as any).client?.document || "";

      // Fallback 1: via devis
      if ((!clientId || !email) && row.devis_id) {
        const { data: devis } = await supabase
          .from("devis")
          .select("client_id")
          .eq("id", row.devis_id)
          .maybeSingle();
        if (devis?.client_id) clientId = devis.client_id;
      }

      // Fallback 2: por nome da contraparte
      if (!clientId && row.counterparty_name) {
        const { data: byName } = await supabase
          .from("clients")
          .select("id")
          .ilike("name", row.counterparty_name)
          .limit(1)
          .maybeSingle();
        if (byName?.id) clientId = byName.id;
      }

      if (clientId) {
        const { data: cli } = await supabase
          .from("clients")
          .select("name, email, phone, document")
          .eq("id", clientId)
          .maybeSingle();
        if (cli) {
          name = cli.name || name;
          email = cli.email || email;
          phone = (cli as any).phone || phone;
          document = (cli as any).document || document;
        }
      }

      setRecipient({ name: name || "", email: email || "", phone: phone || "", document: document || "" });
    } catch (err) {
      console.error("Erro ao resolver dados do cliente:", err);
    } finally {
      setLoadingRecipient(false);
    }
  };

  const confirmAndSend = async () => {
    if (!row) return;
    if (!recipient.email || !/^\S+@\S+\.\S+$/.test(recipient.email)) {
      toast.error("E-mail inválido", { description: "Informe um e-mail válido para o envio." });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          entry_id: row.id,
          to: recipient.email,
          recipient_name: recipient.name,
          recipient_phone: recipient.phone,
          subject: `Cobrança disponível - ${invoiceNumber}`,
          message_text: message,
          invoice_number: invoiceNumber,
          open_amount: fmt(open_),
          due_date: fmtDateBR(row.due_date),
          payment_method: selectedMethod?.name,
          payment_account_id: selectedAccountId,
        },
      });

      if (error) throw error;

      toast.success("Cobrança enviada com sucesso!", {
        description: `Enviada para ${recipient.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ["contas-a-receber"] });
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error sending invoice:", err);
      toast.error("Erro ao enviar cobrança", {
        description: err.message || "Ocorreu um erro inesperado."
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="font-display">Preview da fatura</DialogTitle>
          <DialogDescription>
            Visualize como a cobrança será apresentada ao cliente antes do envio.
          </DialogDescription>
        </DialogHeader>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-0">
          {/* Preview da fatura */}
          <div className="p-6">
            <div className="rounded-xl border bg-white text-zinc-900 shadow-sm overflow-hidden">
              {/* Cabeçalho */}
              <div className="flex items-start justify-between gap-4 p-6 border-b bg-gradient-to-r from-zinc-50 to-white">
                <div className="flex items-center gap-3">
                  <img src={logo} alt={COMPANY.name} className="h-10 w-10" />
                  <div>
                    <p className="font-display text-lg font-bold leading-tight">{COMPANY.name}</p>
                    <p className="text-xs text-zinc-500">{COMPANY.tagline}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Fatura</p>
                  <p className="font-display text-xl font-bold">{invoiceNumber}</p>
                  <Badge variant="outline" className={`mt-1 ${statusBadge[st]}`}>{statusLabel[st]}</Badge>
                </div>
              </div>

              {/* Cliente / Empresa */}
              <div className="grid sm:grid-cols-2 gap-4 p-6 border-b text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500">Cobrar de</p>
                  <p className="font-semibold mt-1 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-zinc-400" /> {cliente}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500">Emitido por</p>
                  <p className="font-semibold mt-1">{COMPANY.name}</p>
                  <p className="text-xs text-zinc-500">{COMPANY.email}</p>
                  <p className="text-xs text-zinc-500">{COMPANY.site}</p>
                </div>
              </div>

              {/* Descrição */}
              <div className="p-6 border-b">
                <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Descrição do serviço</p>
                <p className="font-medium">{formatMovementDescription(row.movement_description, row.devis_number, row.devis_id)}</p>
                {row.devis_id && (
                  <p className="text-xs text-zinc-500 mt-1">Referência: {formatDevisCode(row.devis_number, row.devis_id)}</p>
                )}
              </div>

              {/* Valores */}
              <div className="grid grid-cols-3 gap-4 p-6 border-b">
                <Tile label="Vencimento" value={fmtDateBR(row.due_date)} />
                <Tile label="Método de Pagamento" value={selectedMethod?.name || "—"} />
                <Tile label="Unidade" value={(row as any).business_unit || "—"} />
              </div>

              {/* Dados da Conta */}
              {selectedAccount && (
                <div className="px-6 py-4 bg-zinc-50/50 border-b space-y-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500">
                    <Building2 className="h-3 w-3" />
                    <span>Dados para pagamento</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase">Favorecido</p>
                      <p className="font-medium">{(selectedAccount as any).holder_name || COMPANY.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase">Banco</p>
                      <p className="font-medium">{selectedAccount.bank}</p>
                    </div>
                    {(selectedAccount as any).pix_key && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-zinc-500 uppercase">Chave PIX</p>
                        <p className="font-medium font-mono">{(selectedAccount as any).pix_key}</p>
                      </div>
                    )}
                    {!(selectedAccount as any).pix_key && (selectedAccount as any).account_number && (
                      <>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase">Agência</p>
                          <p className="font-medium font-mono">{(selectedAccount as any).agency || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase">Conta</p>
                          <p className="font-medium font-mono">{(selectedAccount as any).account_number}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="p-6 bg-zinc-50">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-zinc-500">Total a pagar</p>
                    <p className="font-display text-3xl font-bold tabular-nums mt-1">{fmt(open_)}</p>
                    {paid > 0 && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Valor total {fmt(total)} · já recebido {fmt(paid)}
                      </p>
                    )}
                  </div>
                  <Button
                    size="lg"
                    className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-md"
                    onClick={() => toast.info("Instruções de pagamento — em breve")}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pagar agora
                  </Button>
                </div>
              </div>

              {/* Observações */}
              {(row.notes?.trim() || true) && (
                <div className="p-6 border-t">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Observações</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                    {row.notes?.trim()
                      ? row.notes
                      : "Pagamento via PIX ou boleto. Em caso de dúvidas, entre em contato com nossa equipe financeira."}
                  </p>
                </div>
              )}

              {/* Rodapé */}
              <div className="p-4 text-center text-[11px] text-zinc-500 border-t bg-white">
                Esta é uma pré-visualização. Documento gerado por {COMPANY.name}.
              </div>
            </div>
          </div>

          {/* Coluna de mensagem ao cliente */}
          <div className="border-l bg-muted/20 p-6 flex flex-col gap-5">
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Método de Pagamento
                </Label>
                <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                  <SelectTrigger className="mt-1.5 bg-card">
                    <SelectValue placeholder="Selecione o método..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs.paymentMethods.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Conta para Recebimento
                </Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="mt-1.5 bg-card">
                    <SelectValue placeholder="Selecione a conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs.financialAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.bank})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {catalogs.financialAccounts.length === 0 && (
                  <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                    <p className="text-[10px] text-amber-600 leading-tight">
                      Nenhuma conta cadastrada no Financeiro.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Mensagem ao cliente
              </p>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={12}
                className="resize-none text-sm font-mono bg-card"
              />
              <p className="text-[11px] text-muted-foreground mt-2">
                Edite a mensagem que acompanhará a fatura.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={copyMessage}>
                <Copy className="h-4 w-4 mr-2" /> Copiar mensagem
              </Button>
              <Button
                className="w-full justify-start"
                onClick={openConfirmDialog}
                disabled={isSending}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar Cobrança
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Download className="h-4 w-4 mr-2" /> Baixar PDF · Em breve
              </Button>
            </div>

            <div className="mt-auto">
              <p className="text-[11px] text-muted-foreground">
                Nenhum e-mail é enviado nesta etapa. Esta tela é apenas pré-visualização.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Fechar
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Confirmação dos dados do destinatário */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !isSending && setConfirmOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Confirmar envio da cobrança
            </DialogTitle>
            <DialogDescription>
              Revise os dados do cliente antes de enviar. Você pode editar qualquer campo abaixo.
            </DialogDescription>
          </DialogHeader>

          {loadingRecipient ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando dados do cliente...
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Fatura <span className="font-semibold text-foreground">{invoiceNumber}</span> · {fmt(open_)}
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <User className="h-3.5 w-3.5" /> Nome do cliente
                </Label>
                <Input
                  value={recipient.name}
                  onChange={(e) => setRecipient((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Mail className="h-3.5 w-3.5" /> E-mail para envio *
                </Label>
                <Input
                  type="email"
                  value={recipient.email}
                  onChange={(e) => setRecipient((p) => ({ ...p, email: e.target.value }))}
                  placeholder="cliente@email.com"
                  className={!recipient.email ? "border-destructive/50" : ""}
                />
                {!recipient.email && (
                  <p className="text-[11px] text-destructive mt-1">
                    Cliente sem e-mail cadastrado. Informe um e-mail para o envio.
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Phone className="h-3.5 w-3.5" /> Telefone (opcional)
                </Label>
                <Input
                  value={recipient.phone}
                  onChange={(e) => setRecipient((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              {recipient.document && (
                <p className="text-[11px] text-muted-foreground">
                  Documento: <span className="font-mono">{recipient.document}</span>
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isSending}>
              Cancelar
            </Button>
            <Button onClick={confirmAndSend} disabled={isSending || loadingRecipient || !recipient.email}>
              {isSending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar e enviar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="font-semibold mt-1 text-sm">{value}</p>
    </div>
  );
}
