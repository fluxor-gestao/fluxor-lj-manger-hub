// Valida que o proposal_structure contém todas as 11 cláusulas obrigatórias.
const REQUIRED = [
  "I.",
  "II.",
  "III.",
  "IV.",
  "V.",
  "VI.",
  "VII.",
  "VIII.",
  "IX.",
  "X.",
  "XI.",
];

export function getMissingClauses(text?: string | null): string[] {
  const t = (text || "").toString();
  return REQUIRED.filter((m) => !t.includes(m));
}

export function isProposalComplete(text?: string | null): boolean {
  return getMissingClauses(text).length === 0;
}
