// Envia proposta (devis) por e-mail via Resend e marca como enviada no banco
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Lang = "pt" | "fr" | "en" | "es" | "de";

const I18N: Record<Lang, { tagline: string; cta_help: string; view: string }> = {
  pt: {
    tagline: "ADVOCACIA & CONSULTORIA INTERNACIONAL",
    cta_help: "Acesse a proposta completa para revisar os detalhes e, se desejar, aceitá-la ou recusá-la.",
    view: "Visualizar proposta",
  },
  fr: {
    tagline: "AVOCATS & CONSEIL INTERNATIONAL",
    cta_help: "Accédez à la proposition complète pour consulter les détails et, si vous le souhaitez, l'accepter ou la refuser.",
    view: "Voir la proposition",
  },
  en: {
    tagline: "INTERNATIONAL LAW & CONSULTING",
    cta_help: "Open the full proposal to review the details and, if you wish, accept or reject it.",
    view: "View proposal",
  },
  es: {
    tagline: "ABOGADOS & CONSULTORÍA INTERNACIONAL",
    cta_help: "Acceda a la propuesta completa para revisar los detalles y, si lo desea, aceptarla o rechazarla.",
    view: "Ver propuesta",
  },
  de: {
    tagline: "INTERNATIONALE ANWALTSKANZLEI & BERATUNG",
    cta_help: "Öffnen Sie das vollständige Angebot, um die Details zu prüfen und es bei Bedarf anzunehmen oder abzulehnen.",
    view: "Angebot ansehen",
  },
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const BIZ_UNIT_LABELS: Record<string, Record<Lang, string>> = {
  DE: { pt: "ADVOCACIA & CONSULTORIA INTERNACIONAL", fr: "AVOCATS & CONSEIL INTERNATIONAL", en: "INTERNATIONAL LAW & CONSULTING", es: "ABOGADOS & CONSULTORÍA INTERNACIONAL", de: "INTERNATIONALE ANWALTSKANZLEI & BERATUNG" },
  CO: { pt: "CONTABILIDADE INTERNACIONAL", fr: "COMPTABILITÉ INTERNATIONALE", en: "INTERNATIONAL ACCOUNTING", es: "CONTABILIDAD INTERNACIONAL", de: "INTERNATIONALE BUCHHALTUNG" },
  AM: { pt: "CONSULTORIA AMBIENTAL", fr: "CONSEIL ENVIRONNEMENTAL", en: "ENVIRONMENTAL CONSULTING", es: "CONSULTORÍA AMBIENTAL", de: "UMWELTBERATUNG" },
  IM: { pt: "CONSULTORIA IMOBILIÁRIA", fr: "CONSEIL IMMOBILIER", en: "REAL ESTATE CONSULTING", es: "CONSULTORÍA INMOBILIARIA", de: "IMMOBILIENBERATUNG" },
  GE: { pt: "GESTÃO INTERNACIONAL", fr: "GESTION INTERNATIONALE", en: "INTERNATIONAL MANAGEMENT", es: "GESTIÓN INTERNACIONAL", de: "INTERNATIONALES MANAGEMENT" },
};

function buildHtml(messageText: string, acceptUrl: string | undefined, lang: Lang, businessUnit: string = "DE") {
  const t = I18N[lang] ?? I18N.pt;
  const unitTagline = BIZ_UNIT_LABELS[businessUnit]?.[lang] || BIZ_UNIT_LABELS.DE[lang];

  const ctaBlock = acceptUrl
    ? `
      <p style="margin:28px 0 14px;text-align:center;font-size:13px;color:#4b5563">${t.cta_help}</p>
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto">
        <tr>
          <td style="padding:0 6px">
            <a href="${acceptUrl}" style="display:inline-block;background:#1e40af;color:#ffffff;padding:13px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-family:Arial,sans-serif;font-size:14px">${t.view}</a>
          </td>
        </tr>
      </table>`
    : "";


  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;width:100%">
        <tr><td style="padding:28px 36px 0">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;letter-spacing:2px;color:#0f172a">LUNDGAARD JENSEN</div>
          <div style="font-size:11px;letter-spacing:3px;color:#1e40af;margin-top:4px">${unitTagline}</div>
          <div style="height:2px;background:#c8a96a;margin:14px 0 0"></div>
        </td></tr>
        <tr><td style="padding:24px 36px 8px">
          <div style="white-space:pre-wrap;line-height:1.65;font-size:14px;color:#1f2937">${escapeHtml(messageText)}</div>
        </td></tr>
        <tr><td style="padding:8px 36px 32px">${ctaBlock}</td></tr>
        <tr><td style="padding:0 36px 24px">
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 14px" />
          <div style="font-size:11px;color:#6b7280;line-height:1.6">
            Rua João Cordeiro, 831 — Praia de Iracema<br/>
            +55 (85) 9 9406-6042 &nbsp;|&nbsp; +55 (85) 9 3037-9931<br/>
            <a href="https://lundgaardjensen.com" style="color:#1e40af;text-decoration:none">lundgaardjensen.com</a> &nbsp;|&nbsp; @lundgaard.jensen
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Lundgaard Jensen <onboarding@resend.dev>";
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { devis_id, to, subject, message_text, pdf_base64, pdf_filename, accept_url, language, business_unit } = await req.json();
    if (!to?.length || !subject || !message_text) throw new Error("Parâmetros inválidos");

    const lang: Lang = (["pt", "fr", "en", "es", "de"].includes(language) ? language : "pt") as Lang;
    const htmlBody = buildHtml(message_text, accept_url, lang, business_unit);

    const payload: any = {
      from: FROM_EMAIL,
      to,
      subject,
      html: htmlBody,
      text: message_text + (accept_url ? `\n\n${I18N[lang].view}: ${accept_url}` : ""),
    };
    if (pdf_base64 && pdf_filename) {
      payload.attachments = [{ filename: pdf_filename, content: pdf_base64 }];
    }

    // Use Lovable connector gateway if LOVABLE_API_KEY is present (managed Resend connector),
    // otherwise fall back to direct Resend API call with the raw key.
    const useGateway = !!LOVABLE_API_KEY;
    const endpoint = useGateway
      ? "https://connector-gateway.lovable.dev/resend/emails"
      : "https://api.resend.com/emails";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (useGateway) {
      headers["Authorization"] = `Bearer ${LOVABLE_API_KEY}`;
      headers["X-Connection-Api-Key"] = RESEND_API_KEY;
    } else {
      headers["Authorization"] = `Bearer ${RESEND_API_KEY}`;
    }

    const r = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(payload) });

    if (!r.ok) {
      const t = await r.text();
      console.error("Resend error:", r.status, t);
      throw new Error(`Falha ao enviar e-mail: ${r.status} ${t}`);
    }
    const sendResult = await r.json();

    if (devis_id) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      await admin.from("devis").update({ status: "enviada_ao_cliente", sent_at: new Date().toISOString() }).eq("id", devis_id);
    }

    return new Response(JSON.stringify({ ok: true, id: sendResult.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-devis-proposal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
