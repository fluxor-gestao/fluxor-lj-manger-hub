// Códigos internos compartilhados das empresas do Grupo Lundgaard Jensen.
// Estes códigos são os mesmos usados como prefixo da numeração de Devis
// (devis_number) e como valor de `business_unit` em devis, services e
// financial_entries. Mantidos aqui em um único lugar para garantir
// consistência entre o seletor global de empresa, o cadastro de Devis e os
// filtros de listagem/BI.

export type CompanyCode = "DE" | "CO" | "AM" | "IM" | "GE";

export const COMPANY_LIST: { code: CompanyCode; name: string; short: string }[] = [
  { code: "DE", name: "Lundgaard Jensen — Advocatício", short: "Advocatício" },
  { code: "CO", name: "Lundgaard Jensen — Contábil", short: "Contábil" },
  { code: "AM", name: "Lundgaard Jensen — Ambiental", short: "Ambiental" },
  { code: "IM", name: "Lundgaard Jensen — Imobiliária", short: "Imobiliária" },
  { code: "GE", name: "Lundgaard Jensen — Gestão", short: "Gestão" },
];

export const COMPANY_SHORT: Record<CompanyCode, string> = Object.fromEntries(
  COMPANY_LIST.map((c) => [c.code, c.short]),
) as Record<CompanyCode, string>;

export const COMPANY_NAME: Record<CompanyCode, string> = Object.fromEntries(
  COMPANY_LIST.map((c) => [c.code, c.name]),
) as Record<CompanyCode, string>;

// Classe Tailwind para o badge da empresa (cores semânticas distintas por unidade).
export const COMPANY_BADGE_CLASS: Record<CompanyCode, string> = {
  DE: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  CO: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  AM: "border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-300",
  IM: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  GE: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

export function isCompanyCode(v: unknown): v is CompanyCode {
  return v === "DE" || v === "CO" || v === "AM" || v === "IM" || v === "GE";
}
