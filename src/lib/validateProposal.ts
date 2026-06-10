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
  // Se o texto parece conter os cabeçalhos das seções em formato Markdown (## I., ## II., etc),
  // consideramos válido mesmo sem o ponto final exato em alguns casos de formatação.
  return REQUIRED.filter((m) => {
    const pattern = new RegExp(`(##\\s+${m.replace(".", "\\.")}|\\b${m.replace(".", "\\.")}\\s+)`, "i");
    return !pattern.test(t);
  });
}

export function isProposalComplete(text?: string | null): boolean {
  return getMissingClauses(text).length === 0;
}
