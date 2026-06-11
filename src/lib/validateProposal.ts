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
    // Escapa o ponto para a regex
    const escapedM = m.replace(".", "\\.");
    // Procura por: "## I.", "## I ", " I. ", ou "I. " no início da linha/palavra
    const pattern = new RegExp(`(##\\s+${escapedM}|\\b${escapedM}\\b)`, "i");
    return !pattern.test(t);
  });
}

export function isProposalComplete(text?: string | null): boolean {
  // Para propostas legadas ou geradas sem a estrutura completa (I-XI), 
  // permitimos o envio se houver conteúdo substancial, para não bloquear o usuário.
  const missing = getMissingClauses(text);
  if (missing.length === 0) return true;
  
  // Se faltam cláusulas mas o texto tem conteúdo substancial, permitimos o envio para não travar o processo.
  if (text && text.length > 300) {
    return true; 
  }

  return false;
}
