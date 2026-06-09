import { Building2, Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/contexts/CompanyContext";

export function CompanySelector() {
  const { activeCompany, setActiveCompany, companies, isConsolidated } = useCompany();

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground hidden sm:block" />
      <Select value={activeCompany} onValueChange={(v) => setActiveCompany(v as any)}>
        <SelectTrigger className="h-9 w-[220px] sm:w-[260px]">
          <SelectValue placeholder="Empresa ativa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            <span className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" />
              Consolidado (todas)
            </span>
          </SelectItem>
          {companies.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {c.code}
                </span>
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isConsolidated && (
        <Badge variant="outline" className="hidden md:inline-flex border-primary/40 text-primary">
          Consolidado
        </Badge>
      )}
    </div>
  );
}
