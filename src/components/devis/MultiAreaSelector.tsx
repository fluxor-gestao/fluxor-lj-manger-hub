import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, X, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaBadge } from "@/components/AreaBadge";
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
  /** Slugs sugeridos pela IA — apenas para sinalização visual. */
  suggestedAreas?: string[];
}

export function MultiAreaSelector({
  companyCode,
  selectedAreas,
  onChange,
  placeholder = "Selecionar áreas...",
  className,
  mainArea,
  onMainAreaChange,
  suggestedAreas = [],
}: MultiAreaSelectorProps) {
  // Fonte única: tabela `business_areas` (ativas) filtrada pela unidade.
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

  const allAreas = useMemo(
    () => dbAreas.map((a: any) => ({ slug: a.slug, label: a.label || a.name })),
    [dbAreas],
  );

  const suggestedSet = useMemo(() => new Set(suggestedAreas), [suggestedAreas]);


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
          {!companyCode ? (
            <div className="text-sm text-muted-foreground p-2 text-center">
              Selecione a empresa para listar as áreas.
            </div>
          ) : allAreas.length === 0 ? (
            <div className="text-sm text-muted-foreground p-2 text-center">
              Nenhuma área cadastrada para esta unidade.
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
                {suggestedSet.has(area.slug) && (
                  <Badge variant="outline" className="h-5 text-[9px] uppercase font-bold border-primary/40 text-primary gap-1 px-1.5">
                    <Sparkles className="h-2.5 w-2.5" /> IA
                  </Badge>
                )}
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
