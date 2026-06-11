import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaBadge } from "@/components/AreaBadge";
import { getAreasFor } from "@/lib/businessAreas";
import type { CompanyCode } from "@/lib/companyCodes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

interface MultiAreaSelectorProps {
  companyCode: CompanyCode | "";
  selectedAreas: string[];
  onChange: (areas: string[]) => void;
  placeholder?: string;
  className?: string;
  mainArea?: string;
  onMainAreaChange?: (slug: string) => void;
}

export function MultiAreaSelector({
  companyCode,
  selectedAreas,
  onChange,
  placeholder = "Selecionar áreas...",
  className,
  mainArea,
  onMainAreaChange,
}: MultiAreaSelectorProps) {
  // 1. Áreas fixas do arquivo lib
  const legacyAreas = getAreasFor(companyCode as CompanyCode);

  // 2. Áreas dinâmicas do banco de dados (apenas ativas para esta unidade)
  const { data: dbAreas = [], isLoading } = useQuery({
    queryKey: ["business-areas", "active", companyCode],
    queryFn: async () => {
      if (!companyCode) return [];
      const { data, error } = await supabase
        .from("business_areas")
        .select("*")
        .eq("is_active", true)
        .eq("business_unit", companyCode)
        .order("display_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyCode,
  });

  // 3. Mescla as áreas (priorizando DB e evitando duplicatas por slug)
  const allAreas = useMemo(() => {
    const combined = [...dbAreas.map(a => ({ slug: a.slug, label: a.label || a.name }))];
    
    // Adiciona áreas legadas que ainda não estão no DB (opcional, para transição suave)
    legacyAreas.forEach(la => {
      if (!combined.some(ca => ca.slug === la.slug)) {
        combined.push(la);
      }
    });
    
    return combined;
  }, [dbAreas, legacyAreas]);

  const toggleArea = (slug: string) => {
    if (selectedAreas.includes(slug)) {
      onChange(selectedAreas.filter((s) => s !== slug));
    } else {
      onChange([...selectedAreas, slug]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between h-auto min-h-[40px] py-2 px-3 font-normal",
            className
          )}
          disabled={!companyCode}
        >
          <div className="flex flex-wrap gap-1 items-center overflow-hidden text-left">
            {selectedAreas.length > 0 ? (
              selectedAreas.map((slug) => (
                <div key={slug} className="relative group/badge">
                  <AreaBadge 
                    companyCode={companyCode as CompanyCode} 
                    areaSlug={slug}
                    className={cn(
                      "mr-1", 
                      mainArea === slug && "border-primary bg-primary/10 ring-1 ring-primary"
                    )}
                  />
                  {mainArea === slug && (
                    <span className="absolute -top-2 -right-1 text-[8px] bg-primary text-white px-1 rounded-full border border-white">
                      Principal
                    </span>
                  )}
                </div>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin opacity-50 ml-2" /> : <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
          {allAreas.length === 0 ? (
            <div className="text-sm text-muted-foreground p-2 text-center">
              Nenhuma área disponível.
            </div>
          ) : (
            allAreas.map((area) => (
              <div
                key={area.slug}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer group"
                onClick={() => toggleArea(area.slug)}
              >
                <Checkbox
                  id={`area-${area.slug}`}
                  checked={selectedAreas.includes(area.slug)}
                  onCheckedChange={() => toggleArea(area.slug)}
                  className="pointer-events-none"
                />
                <Label
                  htmlFor={`area-${area.slug}`}
                  className="flex-1 cursor-pointer text-sm font-medium leading-none group-hover:text-primary transition-colors"
                >
                  {area.label}
                </Label>
                {selectedAreas.includes(area.slug) && onMainAreaChange && (
                  <Button
                    size="sm"
                    variant={mainArea === area.slug ? "default" : "ghost"}
                    className={cn(
                      "h-6 px-2 text-[10px] uppercase font-bold ml-auto",
                      mainArea === area.slug ? "bg-primary" : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMainAreaChange(area.slug);
                    }}
                  >
                    {mainArea === area.slug ? "Principal" : "Marcar Principal"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
        {selectedAreas.length > 0 && (
          <div className="border-t p-2 bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-8 text-muted-foreground hover:text-destructive"
              onClick={() => onChange([])}
            >
              <X className="h-3 w-3 mr-2" />
              Limpar seleção
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
