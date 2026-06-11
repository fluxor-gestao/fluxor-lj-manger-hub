import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2, AlertCircle, Calendar, FileText, XCircle, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import logo from "@/assets/logo.svg";
import { COMPANY_NAME, type CompanyCode } from "@/lib/companyCodes";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/accept-devis-proposal`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Preview = {
  title: string;
  client_name: string | null;
  total_amount: number;
  down_payment_amount: number;
  deadline_date: string | null;
  scope_description: string | null;
  proposal_structure: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  source_language?: string | null;
  secondary_language?: string | null;
  title_secondary?: string | null;
  scope_description_secondary?: string | null;
  proposal_structure_secondary?: string | null;
  business_unit?: CompanyCode | null;
};

const LANG_LABEL: Record<string, string> = { fr: "FR", en: "EN", es: "ES", pt: "PT" };

const SUMMARY_CAPTION: Record<string, string> = {
  pt: "Resumo das cláusulas principais. A proposta completa segue em PDF anexo.",
  en: "Summary of the main clauses. The full proposal is in the attached PDF.",
  fr: "Résumé des clauses principales. La proposition complète est en pièce jointe (PDF).",
  es: "Resumen de las cláusulas principales. La propuesta completa está en el PDF adjunto.",
};

type State =
  | "loading"
  | "not_found"
  | "ready"
  | "accepting"
  | "rejecting"
  | "success"
  | "rejected"
  | "already_accepted"
  | "already_rejected"
  | "error";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

function cleanInline(s: string): string {
  return s
    .replace(/^#+\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^\s*[IVX]+\.\s*/, "")
    .trim();
}

function firstSentence(s: string, maxLen = 140): string {
  const cleaned = s.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const m = cleaned.match(/^(.+?[\.!?])(\s|$)/);
  let out = m ? m[1] : cleaned;
  if (out.length > maxLen) out = out.slice(0, maxLen).trimEnd() + "…";
  return out;
}

export function summarizeProposal(text?: string | null): { title: string; body: string }[] {
  const src = (text || "").toString();
  if (!src.trim()) return [];

  // Try splitting by roman numerals (I. ... II. ... etc.)
  const re = /(^|\n)\s*(I{1,3}|IV|V|VI{0,3}|IX|XI?)\.\s+/g;
  const indices: { idx: number; num: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (ROMAN.includes(m[2])) {
      indices.push({ idx: m.index + (m[1] ? m[1].length : 0), num: m[2] });
    }
  }

  const bullets: { title: string; body: string }[] = [];

  if (indices.length >= 2) {
    for (let i = 0; i < indices.length && bullets.length < 5; i++) {
      const start = indices[i].idx;
      const end = i + 1 < indices.length ? indices[i + 1].idx : src.length;
      const chunk = src.slice(start, end).trim();
      // Remove leading "I. " marker
      const noMarker = chunk.replace(/^[IVX]+\.\s*/, "");
      const lines = noMarker.split(/\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      const title = cleanInline(lines[0]);
      const rest = lines.slice(1).join(" ");
      const body = firstSentence(rest || "");
      bullets.push({ title, body });
    }
    return bullets;
  }

  // Fallback: list items
  const items = src
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s+/.test(l));
  if (items.length >= 2) {
    return items.slice(0, 5).map((l) => {
      const cleaned = cleanInline(l);
      return { title: firstSentence(cleaned, 80), body: "" };
    });
  }

  // Fallback: first 5 non-empty lines
  return src
    .split(/\n/)
    .map((l) => cleanInline(l))
    .filter(Boolean)
    .slice(0, 5)
    .map((l) => ({ title: firstSentence(l, 100), body: "" }));
}

function SummaryList({ bullets }: { bullets: { title: string; body: string }[] }) {
  if (bullets.length === 0) return null;
  return (
    <ul className="space-y-2 text-sm">
      {bullets.map((b, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-muted-foreground mt-0.5">•</span>
          <span>
            <span className="font-semibold text-foreground">{b.title}</span>
            {b.body && <span className="text-muted-foreground"> — {b.body}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AceitarProposta() {
  const { token } = Route.useParams();
  const [state, setState] = useState<State>("loading");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${FN_URL}?token=${token}`, {
          headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
        });
        if (res.status === 404) return setState("not_found");
        if (!res.ok) {
          setErrorMsg("Não foi possível carregar a proposta.");
          return setState("error");
        }
        const data: Preview = await res.json();
        setPreview(data);
        if (data.accepted_at) setState("already_accepted");
        else if (data.rejected_at) setState("already_rejected");
        else setState("ready");
      } catch {
        setErrorMsg("Erro de conexão.");
        setState("error");
      }
    })();
  }, [token]);

  const handleAccept = async () => {
    setState("accepting");
    try {
      const res = await fetch(`${FN_URL}?token=${token}`, {
        method: "POST",
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      if (!res.ok) {
        setErrorMsg("Não foi possível registrar o aceite.");
        return setState("error");
      }
      const data: Preview = await res.json();
      setPreview(data);
      setState("success");
    } catch {
      setErrorMsg("Erro de conexão.");
      setState("error");
    }
  };

  const handleReject = async () => {
    setRejectOpen(false);
    setState("rejecting");
    try {
      const res = await fetch(`${FN_URL}?token=${token}&action=reject`, {
        method: "POST",
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() || null }),
      });
      if (!res.ok) {
        setErrorMsg("Não foi possível registrar a recusa.");
        return setState("error");
      }
      const data: Preview = await res.json();
      setPreview(data);
      setState("rejected");
    } catch {
      setErrorMsg("Erro de conexão.");
      setState("error");
    }
  };

  const showAccepted = state === "success" || state === "already_accepted";
  const showRejected = state === "rejected" || state === "already_rejected";

  const isBilingual = !!(
    preview?.secondary_language &&
    preview?.proposal_structure_secondary &&
    preview.proposal_structure_secondary.trim().length > 0
  );
  const secLang = (preview?.secondary_language || "").toLowerCase();
  const secLabel = LANG_LABEL[secLang] || secLang.toUpperCase();
  const containerCls = isBilingual ? "max-w-6xl" : "max-w-3xl";

  const ActionButtons = ({ withDisclaimer = false }: { withDisclaimer?: boolean }) => {
    if (state === "accepting") {
      return (
        <div className="flex justify-center">
          <Button size="lg" disabled className="px-10">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registrando aceite...
          </Button>
        </div>
      );
    }
    if (state === "rejecting") {
      return (
        <div className="flex justify-center">
          <Button size="lg" disabled variant="outline" className="px-10">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registrando recusa...
          </Button>
        </div>
      );
    }
    if (state !== "ready") return null;
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            size="lg"
            className="px-10 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleAccept}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> Aceitar proposta
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-10 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setRejectOpen(true)}
          >
            <XCircle className="h-4 w-4 mr-2" /> Recusar proposta
          </Button>
        </div>
        {withDisclaimer && (
          <p className="text-xs text-muted-foreground text-center max-w-md">
            Ao aceitar, você confirma a contratação dos serviços conforme descritos acima.
            Esta ação não poderá ser desfeita.
          </p>
        )}
      </div>
    );
  };

  const captionSec = SUMMARY_CAPTION[secLang] || SUMMARY_CAPTION.en;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="border-b bg-background">
        <div className={`${containerCls} mx-auto px-6 py-5 flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-4">
            <img src={logo} alt="Lundgaard Jensen" className="h-10 w-auto" />
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="hidden sm:block">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lundgaard Jensen</div>
              <div className="text-sm font-bold text-foreground">
                {preview?.business_unit ? COMPANY_NAME[preview.business_unit] : "Consultoria Internacional"}
              </div>
            </div>
          </div>
          {preview?.business_unit && (
            <div className="sm:hidden text-right">
              <div className="text-[10px] font-bold uppercase text-muted-foreground leading-tight">Lundgaard Jensen</div>
              <div className="text-xs font-bold leading-tight truncate max-w-[150px]">
                {COMPANY_NAME[preview.business_unit].split("—")[1]?.trim() || COMPANY_NAME[preview.business_unit]}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className={`${containerCls} mx-auto px-6 py-10 md:py-14`}>
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            Carregando proposta...
          </div>
        )}

        {state === "not_found" && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h1 className="text-xl font-semibold mb-2">Proposta não encontrada</h1>
              <p className="text-muted-foreground">O link pode ter expirado ou estar incorreto.</p>
            </CardContent>
          </Card>
        )}

        {state === "error" && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-3" />
              <h1 className="text-xl font-semibold mb-2">Algo deu errado</h1>
              <p className="text-muted-foreground">{errorMsg}</p>
              <Button className="mt-4" onClick={() => window.location.reload()}>Tentar novamente</Button>
            </CardContent>
          </Card>
        )}

        {(state === "ready" ||
          state === "accepting" ||
          state === "rejecting" ||
          showAccepted ||
          showRejected) &&
          preview && (
            <div className="space-y-6">
              {showAccepted && (
                <Card className="border-green-500/40 bg-green-500/5">
                  <CardContent className="py-6 flex items-start gap-4">
                    <CheckCircle2 className="h-10 w-10 text-green-600 flex-shrink-0" />
                    <div>
                      <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">
                        {state === "success"
                          ? "Proposta aceita com sucesso!"
                          : "Esta proposta já foi aceita"}
                      </h2>
                      {preview.accepted_at && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Em {format(parseISO(preview.accepted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                      <p className="text-sm mt-2">
                        Em breve você receberá a cobrança inicial de <strong>50%</strong> do valor total
                        ({fmtBRL(preview.down_payment_amount)}) para iniciarmos os próximos passos.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {showRejected && (
                <Card className="border-destructive/40 bg-destructive/5">
                  <CardContent className="py-6 flex items-start gap-4">
                    <XCircle className="h-10 w-10 text-destructive flex-shrink-0" />
                    <div>
                      <h2 className="text-xl font-semibold text-destructive">
                        {state === "rejected"
                          ? "Proposta recusada"
                          : "Esta proposta já foi recusada"}
                      </h2>
                      {preview.rejected_at && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Em {format(parseISO(preview.rejected_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                      <p className="text-sm mt-2">Agradecemos seu retorno.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(state === "ready" || state === "accepting" || state === "rejecting") && (
                <ActionButtons />
              )}

              <Card>
                <CardHeader>
                  {isBilingual ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">PT</div>
                        <CardTitle className="text-2xl">{preview.title}</CardTitle>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">{secLabel}</div>
                        <CardTitle className="text-2xl">{preview.title_secondary || preview.title}</CardTitle>
                      </div>
                    </div>
                  ) : (
                    <CardTitle className="text-2xl">{preview.title}</CardTitle>
                  )}
                  {preview.client_name && (
                    <p className="text-muted-foreground mt-2">
                      Para: <span className="font-medium text-foreground">{preview.client_name}</span>
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border bg-white p-5 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Valor total</div>
                      <div className="text-3xl font-black text-slate-900 tabular-nums leading-none">{fmtBRL(preview.total_amount)}</div>
                    </div>
                    <div className="rounded-xl border bg-white p-5 shadow-sm border-indigo-100">
                      <div className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold mb-2">Entrada (50%)</div>
                      <div className="text-3xl font-black text-indigo-600 tabular-nums leading-none">{fmtBRL(preview.down_payment_amount)}</div>
                    </div>
                  </div>

                  {preview.deadline_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Prazo:</span>
                      <span className="font-medium">{format(parseISO(preview.deadline_date), "dd/MM/yyyy")}</span>
                    </div>
                  )}

                  {preview.scope_description && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                        <FileText className="h-4 w-4" /> Escopo
                      </div>
                      {isBilingual ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">PT</div>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{preview.scope_description}</p>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">{secLabel}</div>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{preview.scope_description_secondary || preview.scope_description}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{preview.scope_description}</p>
                      )}
                    </div>
                  )}

                  {preview.proposal_structure && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                        <FileText className="h-4 w-4" /> Estrutura da proposta
                      </div>
                      {isBilingual ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">PT</div>
                            <SummaryList bullets={summarizeProposal(preview.proposal_structure)} />
                            <p className="text-xs italic text-muted-foreground mt-3">{SUMMARY_CAPTION.pt}</p>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{secLabel}</div>
                            <SummaryList bullets={summarizeProposal(preview.proposal_structure_secondary || preview.proposal_structure)} />
                            <p className="text-xs italic text-muted-foreground mt-3">{captionSec}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <SummaryList bullets={summarizeProposal(preview.proposal_structure)} />
                          <p className="text-xs italic text-muted-foreground mt-3">{SUMMARY_CAPTION.pt}</p>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <ActionButtons withDisclaimer />
            </div>
          )}
      </main>

      <footer className="border-t bg-background mt-12">
        <div className={`${containerCls} mx-auto px-6 py-6 text-xs text-muted-foreground leading-relaxed`}>
          <div className="font-medium text-foreground">Lundgaard Jensen Advocacia &amp; Consultoria Internacional</div>
          <div>Rua João Cordeiro, 831 – Praia de Iracema</div>
          <div>+55 (85) 9 9406-6042 &nbsp;|&nbsp; +55 (85) 9 3037-9931</div>
          <div>lundgaardjensen.com &nbsp;|&nbsp; @lundgaard.jensen</div>
        </div>
      </footer>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar proposta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja recusar esta proposta? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo (opcional)</label>
            <Textarea
              rows={4}
              placeholder="Conte rapidamente o motivo da recusa..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject}>Confirmar recusa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/proposta/aceite/$token")({
  component: AceitarProposta,
});
