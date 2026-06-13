import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface RunContext {
  /** Avança para a próxima etapa. */
  next: () => void;
  /** Define a etapa atual (1-based). */
  setStep: (n: number) => void;
}

interface RunOptions {
  successMessage?: string;
  errorMessage?: string;
  /** Tempo (ms) para auto-resetar etapa visual após sucesso. Default 1200. */
  resetDelayMs?: number;
}

/**
 * Hook global para padronizar ações críticas:
 * - Bloqueia clique duplo (`busy`).
 * - Rastreia etapa atual visível (`step`, 1-based).
 * - Mostra toast de sucesso/erro consistente.
 * - Expõe `error` para feedback inline.
 *
 * Uso típico:
 *   const action = useActionRunner(["Validando", "Enviando", "Concluído"]);
 *   await action.run(async ({ next }) => { ...; next(); ...; }, { successMessage: "Enviado!" });
 */
export function useActionRunner(steps: string[] = []) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const reset = useCallback(() => {
    setBusy(false);
    setStep(0);
    setError(null);
    inFlightRef.current = false;
  }, []);

  const run = useCallback(
    async <T,>(
      fn: (ctx: RunContext) => Promise<T>,
      opts: RunOptions = {},
    ): Promise<T | undefined> => {
      if (inFlightRef.current) return undefined;
      inFlightRef.current = true;
      setBusy(true);
      setError(null);
      setStep(1);
      const ctx: RunContext = {
        next: () => setStep((s) => Math.min(s + 1, Math.max(steps.length, 1))),
        setStep: (n: number) => setStep(n),
      };
      try {
        const result = await fn(ctx);
        if (steps.length) setStep(steps.length);
        if (opts.successMessage) toast.success(opts.successMessage);
        setTimeout(() => {
          setStep(0);
          setError(null);
        }, opts.resetDelayMs ?? 1200);
        return result;
      } catch (e: any) {
        const msg =
          e?.message || opts.errorMessage || "Ocorreu um erro inesperado.";
        setError(msg);
        toast.error(opts.errorMessage ?? "Falha na operação", {
          description: msg,
        });
        return undefined;
      } finally {
        setBusy(false);
        inFlightRef.current = false;
      }
    },
    [steps],
  );

  return { busy, step, error, run, reset, setStep };
}
