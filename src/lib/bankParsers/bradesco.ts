// Bradesco PJ/PF — extrato em PDF gerado pelo Bradesco Celular / Net Empresa.
// Layout: Data | Histórico | Docto. | Crédito (R$) | Débito (R$) | Saldo (R$)
// Particularidades:
//  - Data só vem preenchida no 1º lançamento do dia; nas linhas seguintes herda a anterior.
//  - Histórico vem em 2 linhas (tipo + REM/DES + contraparte + data curta dd/mm).
//  - Linhas "Total", "SALDO ANTERIOR" e "SDO CTA/APL AUTOMATICA" devem ser ignoradas.
import type { ParsedOfxTx } from "../parseOfx";

const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})/;
const MONEY_RE = /-?\d{1,3}(?:\.\d{3})*,\d{2}/g;
const SHORT_DATE_RE = /\b(\d{2})\/(\d{2})\b/;

function toIsoDate(d: string, m: string, y: string) {
  return `${y}-${m}-${d}`;
}

function parseMoney(s: string): number {
  return Number(s.replace(/\./g, "").replace(",", "."));
}

const SKIP_RE =
  /^(SALDO\s+ANTERIOR|SDO\s+CTA|S A L D O|Total\b|Folha:|Extrato\s+de:|Bradesco|Data:|Nome:|Agência:|Data\s+Histórico|COD\.\s*LANC)/i;

export function isBradesco(fullText: string): boolean {
  return /Bradesco/i.test(fullText) && /Histórico/i.test(fullText) && /Crédito/i.test(fullText);
}

export function parseBradesco(pages: string[][]): ParsedOfxTx[] {
  const lines: string[] = [];
  for (const p of pages) lines.push(...p);

  const out: ParsedOfxTx[] = [];
  let currentDate: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // captura data principal da linha (se houver)
    const dm = line.match(DATE_RE);
    let working = line;
    if (dm) {
      currentDate = toIsoDate(dm[1], dm[2], dm[3]);
      working = line.slice(dm[0].length).trim();
    }
    if (!currentDate) continue;
    if (SKIP_RE.test(working)) continue;

    // valores monetários na linha
    const moneys = working.match(MONEY_RE) || [];
    if (moneys.length < 2) continue; // precisamos de pelo menos (valor + saldo)

    // O último número é sempre o saldo; o penúltimo é o valor da transação.
    const saldo = parseMoney(moneys[moneys.length - 1]);
    const valor = parseMoney(moneys[moneys.length - 2]);
    if (!isFinite(valor) || valor === 0) continue;

    // pega o histórico = tudo antes do primeiro valor monetário
    const firstMoneyIdx = working.search(MONEY_RE);
    let historico = firstMoneyIdx > 0 ? working.slice(0, firstMoneyIdx).trim() : "";

    // tenta anexar a próxima linha (REM:/DES:/descrição complementar) se não tiver valores
    const next = (lines[i + 1] || "").trim();
    if (next && !DATE_RE.test(next) && !(next.match(MONEY_RE) || []).length && !SKIP_RE.test(next)) {
      historico = [historico, next].filter(Boolean).join(" — ");
      i++; // consome a linha complementar
    }

    if (!historico) historico = "Lançamento";
    if (SKIP_RE.test(historico)) continue;

    // direção: REM = recebido (entrada), DES = enviado (saída). Fallback: olhar saldo anterior.
    let direction: "entrada" | "saida" | null = null;
    if (/\bREM:/i.test(historico)) direction = "entrada";
    else if (/\bDES:/i.test(historico)) direction = "saida";

    // Heurística adicional pela posição relativa das duas colunas (Crédito antes de Débito):
    // se a soma da palavra "Débito" não aparece, tentamos inferir pelo saldo anterior conhecido.
    if (!direction) {
      const prevSaldo = out.length ? out[out.length - 1].raw.saldoApos : null;
      if (prevSaldo != null) {
        const delta = saldo - Number(prevSaldo);
        direction = delta >= 0 ? "entrada" : "saida";
      } else {
        direction = "entrada";
      }
    }

    // limpa data curta dd/mm que costuma aparecer no final do histórico
    historico = historico.replace(SHORT_DATE_RE, "").replace(/\s{2,}/g, " ").trim();
    // limpa códigos de documento numéricos longos (>=6 dígitos) soltos no fim
    historico = historico.replace(/\s\d{6,}\b/g, "").trim();

    out.push({
      date: currentDate,
      description: historico,
      amount: Math.abs(valor),
      direction,
      raw: { saldoApos: String(saldo), source: "bradesco-local" },
    });
  }

  return out;
}
