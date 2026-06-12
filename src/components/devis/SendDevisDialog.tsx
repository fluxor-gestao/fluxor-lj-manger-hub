import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Send, Check, AlertCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import DevisPdfTemplate from "./DevisPdfTemplate";
import { COMPANY_NAME } from "@/lib/companyCodes";
import { formatDevisCode } from "@/lib/formatDevis";
import { generateDevisPdfBase64 } from "@/lib/exportDevisPdf";
import { ensureDevisBilingual } from "@/lib/ensureDevisBilingual";
import { getMissingClauses, isProposalComplete } from "@/lib/validateProposal";

type Lang = "pt" | "fr" | "en" | "es";

function detectLanguage(text?: string | null): Lang {
  if (!text) return "pt";
  const t = text.toLowerCase();
  if (/\bhonoraires|prestation|client\b/.test(t) && /[éèàç]/.test(text)) return "fr";
  if (/\bhonorarios|prestación|cliente\b/.test(t) && /[ñáéíóú]/.test(text)) return "es";
  if (/\bfees|scope|client\b/.test(t) && !/[áéíóúçãõ]/.test(text)) return "en";
  return "pt";
}

const DEFAULT_MESSAGE: Record<Lang, (client: string, devisNum: string) => string> = {
  pt: (c, n) =>
    `Prezado(a) ${c},\n\nConforme conversado, segue em anexo a proposta ${n} da Lundgaard Jensen Advocacia e Consultoria Internacional.\n\nPara aceitar a proposta de forma rápida e segura, clique no botão "Aceitar Proposta" abaixo.\n\nPermanecemos à disposição.\n\nAtenciosamente,\nEquipe Lundgaard Jensen`,
  fr: (c, n) =>
    `Cher/Chère ${c},\n\nComme convenu, veuillez trouver ci-joint la proposition ${n} de Lundgaard Jensen Avocats et Conseil International.\n\nPour accepter la proposition de manière rapide et sécurisée, cliquez sur le bouton "Accepter la Proposition" ci-dessous.\n\nNous restons à votre disposition.\n\nCordialement,\nÉquipe Lundgaard Jensen`,
  en: (c, n) =>
    `Dear ${c},\n\nAs discussed, please find attached proposal ${n} from Lundgaard Jensen International Law & Consulting.\n\nTo accept the proposal quickly and securely, click the "Accept Proposal" button below.\n\nWe remain at your disposal.\n\nBest regards,\nLundgaard Jensen Team`,
  es: (c, n) =>
    `Estimado(a) ${c},\n\nSegún lo conversado, adjuntamos la propuesta ${n} de Lundgaard Jensen Abogados y Consultoría Internacional.\n\nPara aceptar la propuesta de forma rápida y segura, haga clic en el botón "Aceptar la Propuesta" a continuación.\n\nQuedamos a su disposición.\n\nAtentamente,\nEquipo Lundgaard Jensen`,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  devis: any;
  client: any;
}

export default function SendDevisDialog({ open, onOpenChange, devis, client }: Props) {
  const queryClient = useQueryClient();
  const language = useMemo<Lang>(() => {
    const src = (devis?.source_language || "").toLowerCase();
    if (src === "pt" || src === "fr" || src === "en" || src === "es") return src as Lang;
    return detectLanguage(devis?.proposal_structure);
  }, [devis?.source_language, devis?.proposal_structure]);
  const publicBase =
    (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ||
    "https://ljmanager.fluxorbi.com";
  const acceptUrl = `${publicBase}/proposta/aceite/${devis?.accept_token}`;
  const devisNumber = formatDevisCode(devis?.devis_number, devis?.id);

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTo(client?.email || "");
    const bizUnit = devis?.business_unit;
    const companyName = (bizUnit && COMPANY_NAME[bizUnit as keyof typeof COMPANY_NAME]) || "Lundgaard Jensen";
    setSubject(`Proposta ${devisNumber} — ${companyName}`);
    setMessage(DEFAULT_MESSAGE[language](client?.name || "Cliente", devisNumber));
  }, [open, client?.email, client?.name, devisNumber, language]);

  const handleSend = async () => {
    const recipients = to
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      toast.error("Informe ao menos um destinatário");
      return;
    }
    if (!subject.trim() || !message.trim()) {
      toast.error("Assunto e mensagem são obrigatórios");
      return;
    }
    if (!isProposalComplete(devis?.proposal_structure)) {
      const missing = getMissingClauses(devis?.proposal_structure);
      toast.error(`Proposta incompleta — regere a proposta. Cláusulas faltantes: ${missing.join(", ")}`);
      return;
    }

    setSending(true);
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.zIndex = "-1";
    document.body.appendChild(host);
    const root = createRoot(host);

    try {
      let effectiveDevis: any = devis;
      try {
        effectiveDevis = await ensureDevisBilingual(devis);
      } catch (e: any) {
        console.warn("ensureDevisBilingual falhou — enviando monolíngue:", e?.message);
      }
      await new Promise<void>((resolve) => {
        root.render(<DevisPdfTemplate devis={effectiveDevis} client={client} />);
        setTimeout(resolve, 800);
      });
      const safeName = (client?.name || "cliente").replace(/[^\w\-]+/g, "_");
      const filename = `Devis-${devisNumber}-${safeName}.pdf`;
      const { base64 } = await generateDevisPdfBase64(host, filename);

      // Envia via edge function (Resend) — uma chamada por destinatário
      let lastError: string | null = null;
      for (const recipient of recipients) {
        const { data, error } = await supabase.functions.invoke("send-devis-proposal", {
          body: {
            devis_id: devis.id,
            to: [recipient],
            subject,
            message_text: message,
            pdf_base64: base64,
            pdf_filename: filename,
            accept_url: acceptUrl,
            language,
            business_unit: devis.business_unit,
          },
        });
        if (error || (data && (data as any).error)) {
          lastError = error?.message || (data as any)?.error || `Falha ao enviar para ${recipient}`;
          break;
        }
      }
      if (lastError) throw new Error(lastError);

      toast.success("Proposta enviada ao cliente!");
      queryClient.invalidateQueries({ queryKey: ["devis"] });
      queryClient.invalidateQueries({ queryKey: ["devis", devis.id] });
      onOpenChange(false);

    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar proposta");
    } finally {
      root.unmount();
      host.remove();
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar proposta ao cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Para</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@exemplo.com (separe múltiplos por vírgula)"
            />
          </div>
          <div>
            <Label>Assunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Mensagem ({language.toUpperCase()})</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={10} />
          </div>
          <div>
            <Label>Link de aceite (incluído como botão no e-mail)</Label>
            <Input value={acceptUrl} readOnly className="font-mono text-xs" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending} className="bg-green-600 hover:bg-green-700">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
