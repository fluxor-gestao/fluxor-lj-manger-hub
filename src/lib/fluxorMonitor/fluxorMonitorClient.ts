// Cliente frontend do Fluxor Monitor.
// Faz POST para o proxy serverless interno (/api/public/fluxor-monitor/*)
// — a API key NUNCA trafega pelo navegador.

const PROXY_BASE = "/api/public/fluxor-monitor";

export const FLUXOR_SYSTEM_KEY = "lj-manager-hub";
export const FLUXOR_ENV = "production";

export type FluxorErrorLevel = "error" | "warning" | "info";

export interface FluxorErrorPayload {
  level?: FluxorErrorLevel;
  message: string;
  screen?: string;
  user_email?: string | null;
  stack_trace?: string;
  metadata?: Record<string, unknown>;
}

export interface FluxorTicketPayload {
  title: string;
  description: string;
  type: "erro" | "duvida" | "melhoria" | "solicitacao";
  priority: "baixa" | "media" | "alta" | "critica";
  screen?: string;
  user_email?: string | null;
  metadata?: Record<string, unknown>;
}

function safeBrowser() {
  if (typeof navigator === "undefined") return "server";
  return navigator.userAgent ?? "unknown";
}

function safeUrl() {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function safeScreen() {
  if (typeof window === "undefined") return "";
  return window.location.pathname + window.location.search;
}

// Remove campos potencialmente sensíveis de qualquer metadata enviado.
const SENSITIVE_KEYS = /pass(word)?|token|secret|authorization|cpf|cnpj|cartao|card|cvv|iban|conta/i;
function scrub<T>(value: T, depth = 0): T {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1)) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = scrub(v, depth + 1);
      }
    }
    return out as unknown as T;
  }
  return value;
}

async function post(endpoint: "errors" | "tickets", payload: Record<string, unknown>) {
  try {
    const res = await fetch(`${PROXY_BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[FluxorMonitor] falha ao enviar", endpoint, err);
    }
    return { ok: false, status: 0 };
  }
}

export async function sendError(payload: FluxorErrorPayload): Promise<{ ok: boolean }> {
  const body = {
    system_key: FLUXOR_SYSTEM_KEY,
    level: payload.level ?? "error",
    message: payload.message?.slice(0, 1000) ?? "Unknown error",
    screen: payload.screen ?? safeScreen(),
    user_email: payload.user_email ?? null,
    stack_trace: payload.stack_trace?.slice(0, 8000) ?? "",
    environment: FLUXOR_ENV,
    metadata: scrub({
      browser: safeBrowser(),
      url: safeUrl(),
      timestamp: new Date().toISOString(),
      ...(payload.metadata ?? {}),
    }),
  };
  return post("errors", body);
}

export async function sendTicket(payload: FluxorTicketPayload): Promise<{ ok: boolean }> {
  const body = {
    system_key: FLUXOR_SYSTEM_KEY,
    title: payload.title.slice(0, 200),
    description: payload.description.slice(0, 5000),
    type: payload.type,
    priority: payload.priority,
    screen: payload.screen ?? safeScreen(),
    user_email: payload.user_email ?? null,
    environment: FLUXOR_ENV,
    metadata: scrub({
      url: safeUrl(),
      browser: safeBrowser(),
      timestamp: new Date().toISOString(),
      ...(payload.metadata ?? {}),
    }),
  };
  return post("tickets", body);
}
