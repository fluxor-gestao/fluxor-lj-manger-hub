import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { areaLabel } from "@/lib/businessAreas";
import type { CompanyCode } from "@/lib/companyCodes";

type Props = {
  companyCode?: CompanyCode | string | null;
  areaSlug?: string | null;
  className?: string;
};

/**
 * Badge compacta para exibir a Área Principal (Centro de Resultado) de um
 * Devis/Serviço. Renderiza "—" quando não houver slug.
 */
export function AreaBadge({ companyCode, areaSlug, className }: Props) {
  if (!areaSlug) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Layers className="h-3 w-3" /> —
      </span>
    );
  }
  const label = areaLabel((companyCode ?? null) as CompanyCode | null, areaSlug);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      <Layers className="h-3 w-3 opacity-70" />
      {label}
    </span>
  );
}

export default AreaBadge;
