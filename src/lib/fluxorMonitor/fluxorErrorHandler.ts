// Hook global de captura de erros do navegador.
// - Envia para o Fluxor Monitor de forma assíncrona e silenciosa.
// - Deduplica o mesmo erro em janelas curtas.
// - Nunca interrompe o app se o Fluxor estiver indisponível.
import { sendError } from "./fluxorMonitorClient";
import { supabase } from "@/integrations/supabase/client";

const DEDUPE_WINDOW_MS = 30_000;
const MAX_PER_MINUTE = 10;

const recent = new Map<string, number>();
let windowStart = Date.now();
let countInWindow = 0;
let installed = false;
let currentEmail: string | null = null;

function shouldSend(key: string): boolean {
  const now = Date.now();

  if (now - windowStart > 60_000) {
    windowStart = now;
    countInWindow = 0;
  }
  if (countInWindow >= MAX_PER_MINUTE) return false;

  const last = recent.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return false;

  recent.set(key, now);
  countInWindow += 1;

  // GC do dedupe map
  if (recent.size > 200) {
    for (const [k, t] of recent) {
      if (now - t > DEDUPE_WINDOW_MS) recent.delete(k);
    }
  }
  return true;
}

function reportError(message: string, stack: string | undefined, extra?: Record<string, unknown>) {
  const key = `${message}::${(stack ?? "").split("\n")[1] ?? ""}`;
  if (!shouldSend(key)) return;
  void sendError({
    message,
    stack_trace: stack,
    user_email: currentEmail,
    metadata: extra,
  });
}

export function installFluxorErrorHandler() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Mantém o email do usuário logado atualizado sem expor tokens.
  supabase.auth.getSession().then(({ data }) => {
    currentEmail = data.session?.user?.email ?? null;
  });
  supabase.auth.onAuthStateChange((_evt, session) => {
    currentEmail = session?.user?.email ?? null;
  });

  window.addEventListener("error", (event) => {
    const err = event.error as Error | undefined;
    reportError(
      err?.message || event.message || "Unknown error",
      err?.stack,
      { source: event.filename, line: event.lineno, col: event.colno },
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";
    const stack = reason instanceof Error ? reason.stack : undefined;
    reportError(message, stack, { kind: "unhandledrejection" });
  });
}

// API utilitária para captura manual em try/catch.
export function captureError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  reportError(message, stack, context);
}
