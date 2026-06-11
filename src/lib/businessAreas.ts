// Catálogo de Áreas Principais (Centro de Resultado) por empresa do Grupo
// Lundgaard Jensen. Os slugs são gravados em devis.responsible_sector e
// copiados para services.responsible_sector quando o devis é aceito.
// Agora as áreas também são geridas dinamicamente na tabela 'business_areas'.
//
// Mantém o catálogo no front-end (sem migração) para permitir filtros e
// análises por área em Comercial, Operação, Financeiro e BI.

import type { CompanyCode } from "@/lib/companyCodes";

export type Area = { slug: string; label: string };

export const BUSINESS_AREAS: Record<CompanyCode, Area[]> = {
  DE: [
    { slug: "migratorio", label: "Migratório" },
    { slug: "civil", label: "Civil" },
    { slug: "contencioso", label: "Contencioso" },
    { slug: "consultivo", label: "Consultivo" },
  ],
  AM: [
    { slug: "topografia", label: "Topografia" },
    { slug: "licenciamento", label: "Licenciamento" },
    { slug: "regularizacao", label: "Regularização" },
  ],
  CO: [
    { slug: "fiscal", label: "Fiscal" },
    { slug: "contabil", label: "Contábil" },
    { slug: "departamento_pessoal", label: "Departamento Pessoal" },
  ],
  IM: [
    { slug: "venda_imoveis", label: "Venda de Imóveis" },
    { slug: "regularizacao_imobiliaria", label: "Regularização Imobiliária" },
    { slug: "administracao_imoveis", label: "Administração de Imóveis" },
  ],
  GE: [
    { slug: "consultoria", label: "Consultoria" },
    { slug: "bpo_financeiro", label: "BPO Financeiro" },
    { slug: "planejamento", label: "Planejamento" },
  ],
};

export const ALL_AREAS: { company: CompanyCode; area: Area }[] = (
  Object.entries(BUSINESS_AREAS) as [CompanyCode, Area[]][]
).flatMap(([company, areas]) => areas.map((area) => ({ company, area })));

export function getAreasFor(code: CompanyCode | null | undefined): Area[] {
  if (!code) return [];
  return BUSINESS_AREAS[code] ?? [];
}

import { supabase } from "@/integrations/supabase/client";

// Busca dinâmica para labels que não estão no catálogo fixo
let dbAreasCache: Record<string, string> = {};
const loadDbAreas = async () => {
  try {
    const { data } = await supabase.from("business_areas").select("slug, label, name");
    if (data) {
      dbAreasCache = Object.fromEntries(data.map(a => [a.slug, a.label || a.name]));
    }
  } catch (e) {
    console.error("Erro ao carregar business_areas dinâmicas", e);
  }
};
// Dispara carga inicial (fire and forget)
loadDbAreas();

export function findArea(
  code: CompanyCode | null | undefined,
  slug: string | null | undefined,
): Area | null {
  if (!slug) return null;
  // Quando a empresa é conhecida, procura no catálogo dela primeiro.
  if (code) {
    const local = BUSINESS_AREAS[code]?.find((a) => a.slug === slug);
    if (local) return local;
  }
  // Fallback: procura em todas as empresas (útil para valores legados).
  for (const list of Object.values(BUSINESS_AREAS)) {
    const hit = list.find((a) => a.slug === slug);
    if (hit) return hit;
  }
  
  // Procura no cache dinâmico do banco
  if (dbAreasCache[slug]) {
    return { slug, label: dbAreasCache[slug] };
  }

  return null;
}

export function areaLabel(
  code: CompanyCode | null | undefined,
  slug: string | null | undefined,
): string {
  if (!slug) return "—";
  return findArea(code, slug)?.label ?? slug;
}

export function isValidAreaForCompany(
  code: CompanyCode | null | undefined,
  slug: string | null | undefined,
): boolean {
  if (!code || !slug) return false;
  return (BUSINESS_AREAS[code] ?? []).some((a) => a.slug === slug);
}
