import type { ParsedOfxTx } from "../parseOfx";
import { extractPdfText } from "../pdfText";
import { isBradesco, parseBradesco } from "./bradesco";

export interface LocalParseResult {
  layout: string | null; // ex: "bradesco" ou null se não reconhecido
  transactions: ParsedOfxTx[];
  text: string; // texto bruto extraído (útil para fallback IA)
}

export async function parseBankStatementPdfLocal(file: File | ArrayBuffer): Promise<LocalParseResult> {
  const { pages, fullText } = await extractPdfText(file);

  if (isBradesco(fullText)) {
    const tx = parseBradesco(pages);
    if (tx.length > 0) return { layout: "bradesco", transactions: tx, text: fullText };
  }

  return { layout: null, transactions: [], text: fullText };
}
