import { supabase } from "@/integrations/supabase/client";
import type { CompanyCode } from "@/lib/companyCodes";

function normalize(s: string): string {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type AreaResolution = {
  /** Slugs válidos (presentes em business_areas para a unidade). */
  valid: string[];
  /** Entradas que não foram mapeadas. */
  unknown: string[];
};

/**
 * Resolve uma lista de entradas (slug, label ou texto livre vindo da IA) contra
 * o catálogo `business_areas` da unidade de negócio. Garante que tudo o que for
 * salvo em `devis_service_areas.area_slug` exista no catálogo.
 */
export async function resolveAreasForUnit(
  unit: CompanyCode | string | null | undefined,
  rawList: (string | null | undefined)[] | null | undefined,
): Promise<AreaResolution> {
  const list = (rawList ?? []).map((x) => (x ?? "").toString().trim()).filter(Boolean);
  if (!unit || list.length === 0) return { valid: [], unknown: list };

  const { data, error } = await supabase
    .from("business_areas")
    .select("slug, label, name")
    .eq("is_active", true)
    .eq("business_unit", unit);

  if (error || !data || data.length === 0) {
    return { valid: [], unknown: list };
  }

  const bySlug = new Map<string, string>();
  const byLabel = new Map<string, string>();
  for (const row of data) {
    const slug = (row.slug as string) || "";
    if (!slug) continue;
    bySlug.set(slug.toLowerCase(), slug);
    bySlug.set(normalize(slug), slug);
    if (row.label) byLabel.set(normalize(row.label as string), slug);
    if (row.name) byLabel.set(normalize(row.name as string), slug);
  }

  const valid = new Set<string>();
  const unknown: string[] = [];

  for (const raw of list) {
    const direct = bySlug.get(raw.toLowerCase()) || bySlug.get(normalize(raw));
    if (direct) {
      valid.add(direct);
      continue;
    }
    const exact = byLabel.get(normalize(raw));
    if (exact) {
      valid.add(exact);
      continue;
    }
    const n = normalize(raw);
    let partial: string | undefined;
    for (const [key, slug] of byLabel.entries()) {
      if (!key) continue;
      if (key === n) {
        partial = slug;
        break;
      }
      if (key.includes(n) || n.includes(key)) {
        partial = slug;
        break;
      }
    }
    if (partial) {
      valid.add(partial);
    } else {
      unknown.push(raw);
    }
  }

  return { valid: Array.from(valid), unknown };
}
