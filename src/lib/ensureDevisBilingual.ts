import { supabase } from "@/integrations/supabase/client";

type Lang = "pt" | "fr" | "en" | "es" | "de";

/**
 * Garante que o devis tenha campos traduzidos para o idioma do cliente
 * (quando estrangeiro). PT é sempre a fonte de verdade; a 2ª coluna do PDF
 * vem dos campos *_secondary, populados sob demanda por translate-devis e
 * persistidos no banco.
 */
export async function ensureDevisBilingual(devis: any): Promise<any> {
  const target = (devis?.source_language || "pt") as Lang;
  // cliente brasileiro: nada a traduzir
  if (target === "pt") return devis;

  // já traduzido para o idioma atual: retorna como está
  if (
    devis?.secondary_language === target &&
    typeof devis?.proposal_structure_secondary === "string" &&
    devis.proposal_structure_secondary.trim().length > 0
  ) {
    return devis;
  }

  const fields: Record<string, any> = {
    title: devis?.title || "",
    scope_description: devis?.scope_description || "",
    proposal_structure: devis?.proposal_structure || "",
    payment_terms: devis?.payment_terms || "",
    scope_items: Array.isArray(devis?.scope_items) ? devis.scope_items : [],
    assumptions: Array.isArray(devis?.assumptions) ? devis.assumptions : [],
  };

  // se não há nada substancial para traduzir, devolve o devis
  if (!fields.proposal_structure && !fields.scope_description) return devis;

  const { data, error } = await supabase.functions.invoke("translate-devis", {
    body: { fields, target_language: target, source_language: "pt" },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const t = data?.translated || {};
  const patch: Record<string, any> = {
    secondary_language: target,
    title_secondary: t.title ?? null,
    scope_description_secondary: t.scope_description ?? null,
    proposal_structure_secondary: t.proposal_structure ?? null,
    payment_terms_secondary: t.payment_terms ?? null,
    scope_items_secondary: t.scope_items ?? null,
    assumptions_secondary: t.assumptions ?? null,
  };

  const { error: upErr } = await supabase.from("devis").update(patch as any).eq("id", devis.id);
  if (upErr) throw upErr;

  return { ...devis, ...patch };
}
