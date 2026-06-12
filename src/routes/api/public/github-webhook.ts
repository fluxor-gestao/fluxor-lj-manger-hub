import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type EntryType = "ajuste" | "melhoria" | "implementacao";

// Convencional commits → tipo do changelog
const TYPE_MAP: Record<string, EntryType> = {
  feat: "implementacao",
  feature: "implementacao",
  add: "implementacao",
  novo: "implementacao",
  fix: "ajuste",
  bug: "ajuste",
  bugfix: "ajuste",
  hotfix: "ajuste",
  ajuste: "ajuste",
  correcao: "ajuste",
  "correção": "ajuste",
  style: "melhoria",
  refactor: "melhoria",
  perf: "melhoria",
  ui: "melhoria",
  ux: "melhoria",
  melhoria: "melhoria",
  improve: "melhoria",
};

const IGNORE_PREFIXES = new Set(["chore", "docs", "doc", "test", "tests", "ci", "build", "release", "merge", "revert"]);

function classify(message: string): { type: EntryType; description: string } | null {
  const firstLine = message.split("\n")[0].trim();
  if (!firstLine) return null;
  // Pula merges
  if (/^merge\b/i.test(firstLine) || /^revert\b/i.test(firstLine)) return null;

  const match = firstLine.match(/^(\w+)(?:\([^)]*\))?\s*:\s*(.+)$/);
  if (match) {
    const prefix = match[1].toLowerCase();
    const rest = match[2].trim();
    if (IGNORE_PREFIXES.has(prefix)) return null;
    const type = TYPE_MAP[prefix];
    if (type) return { type, description: rest };
  }

  // Heurística fallback
  const lower = firstLine.toLowerCase();
  if (/\b(fix|bug|corrige|corrigi|ajuste|ajusta)\b/.test(lower)) {
    return { type: "ajuste", description: firstLine };
  }
  if (/\b(refactor|refatora|melhora|improve|perf|otimiza|style|ui|ux)\b/.test(lower)) {
    return { type: "melhoria", description: firstLine };
  }
  if (/\b(add|adiciona|cria|novo|nova|implementa|feat)\b/.test(lower)) {
    return { type: "implementacao", description: firstLine };
  }
  return null;
}

async function POST({ request }: { request: Request }) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const event = request.headers.get("x-github-event") ?? "";
  const body = await request.text();

  // Verifica assinatura HMAC
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("Invalid signature", { status: 401 });
  }

  if (event === "ping") {
    return new Response(JSON.stringify({ ok: true, ping: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  if (event !== "push") {
    return new Response(JSON.stringify({ ok: true, ignored: event }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = JSON.parse(body) as {
    ref?: string;
    commits?: Array<{ id: string; message: string; author?: { name?: string } }>;
    repository?: { default_branch?: string };
  };

  // Só processa pushes para a branch default
  const defaultBranch = payload.repository?.default_branch ?? "main";
  if (payload.ref && payload.ref !== `refs/heads/${defaultBranch}`) {
    return new Response(JSON.stringify({ ok: true, ignored: "non-default-branch" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const commits = payload.commits ?? [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const rows: Array<{ type: EntryType; description: string; source_ref: string }> = [];
  for (const c of commits) {
    const result = classify(c.message);
    if (!result) continue;
    rows.push({ type: result.type, description: result.description, source_ref: c.id });
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ ok: true, inserted: 0, total: commits.length }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Deduplica por source_ref (idempotência caso o GitHub reenvie)
  const shas = rows.map((r) => r.source_ref);
  const { data: existing } = await supabaseAdmin
    .from("changelog_entries")
    .select("source_ref")
    .in("source_ref", shas);
  const seen = new Set((existing ?? []).map((e: any) => e.source_ref));
  const toInsert = rows.filter((r) => !seen.has(r.source_ref));

  if (toInsert.length === 0) {
    return new Response(JSON.stringify({ ok: true, inserted: 0, duplicates: rows.length }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error } = await supabaseAdmin.from("changelog_entries").insert(toInsert);
  if (error) {
    console.error("[github-webhook] insert error", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, inserted: toInsert.length }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/github-webhook")({
  server: { handlers: { POST } },
});
