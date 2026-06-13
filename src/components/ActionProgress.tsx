import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionProgressProps {
  steps: string[];
  /** 1-based index of the currently active step. 0 = idle. steps.length = completed. */
  currentStep: number;
  error?: string | null;
  className?: string;
  title?: string;
}

/**
 * Componente global de progresso por etapas para ações críticas do sistema.
 * Mostra a etapa atual, etapas concluídas, erro (se houver) e estado final.
 */
export function ActionProgress({
  steps,
  currentStep,
  error,
  className,
  title = "Progresso da operação",
}: ActionProgressProps) {
  if (currentStep === 0 && !error) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/40 p-3 space-y-2",
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <ol className="space-y-1.5">
        {steps.map((label, idx) => {
          const n = idx + 1;
          const done = currentStep > n || currentStep === steps.length;
          const active = currentStep === n && !error;
          const failed = !!error && currentStep === n;
          return (
            <li key={`${label}-${idx}`} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  failed && "bg-destructive/15 text-destructive",
                  !failed && done && "bg-emerald-100 text-emerald-700",
                  !failed && active && "bg-primary/15 text-primary",
                  !failed && !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {failed ? (
                  <AlertCircle className="h-3 w-3" />
                ) : done ? (
                  <Check className="h-3 w-3" />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  n
                )}
              </span>
              <span
                className={cn(
                  failed && "text-destructive font-medium",
                  !failed && done && "text-foreground",
                  !failed && active && "text-foreground font-medium",
                  !failed && !done && !active && "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      {error && (
        <div className="mt-2 rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
