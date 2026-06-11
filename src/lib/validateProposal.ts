// O sistema pode sugerir cláusulas obrigatórias (I a XI), 
// mas não deve impedir o envio se o usuário decidir omitir alguma ou usar outro formato.
const REQUIRED = [
  "I.", "II.", "III.", "IV.", "V.", "VI.", "VII.", "VIII.", "IX.", "X.", "XI.",
];

export function getMissingClauses(text?: string | null): string[] {
  const t = (text || "").toString();
  return REQUIRED.filter((m) => {
    const escapedM = m.replace(".", "\\.");
    const pattern = new RegExp(`(##\\s+${escapedM}|\\b${escapedM}\\b)`, "i");
    return !pattern.test(t);
  });
}

export function isProposalComplete(text?: string | null): boolean {
  // Sempre retornamos true para não bloquear o envio da proposta,
  // independente da presença das cláusulas I a XI.
  // A validação passa a ser apenas informativa se necessário.
  return true;
}
