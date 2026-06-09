import { Building2, Layers } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";

export function ActiveCompanyBanner({ className }: { className?: string }) {
  const { isConsolidated, activeLabel } = useCompany();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs",
        isConsolidated
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-border bg-muted/40 text-foreground",
        className,
      )}
    >
      {isConsolidated ? <Layers className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
      <span className="text-muted-foreground">Visualizando:</span>
      <span className="font-medium">{activeLabel}</span>
    </div>
  );
}
