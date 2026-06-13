// Deduplication helpers for bank statement uploads.
// Reusable by manual upload, future bank API, and auto-sync flows.

function normalizeDescription(desc: string | null | undefined): string {
  return (desc ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface DedupInput {
  bankAccountId?: string | null;
  date: string; // YYYY-MM-DD
  amount: number; // absolute value
  direction: string; // entrada | saida
  description?: string | null;
  documentNumber?: string | null;
}

export async function computeEntryHash(input: DedupInput): Promise<string> {
  const amount = Math.abs(Number(input.amount) || 0).toFixed(2);
  const key = [
    input.bankAccountId ?? "no-account",
    input.date,
    amount,
    (input.direction || "").toLowerCase(),
    normalizeDescription(input.description),
    (input.documentNumber ?? "").toString().trim(),
  ].join("|");
  return sha256Hex(key);
}

export async function computeFileHash(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
