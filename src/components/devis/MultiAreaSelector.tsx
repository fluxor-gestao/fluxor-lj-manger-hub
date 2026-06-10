import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaBadge } from "@/components/AreaBadge";
import { getAreasFor } from "@/lib/businessAreas";
import type { CompanyCode } from "@/lib/companyCodes";

interface MultiAreaSelectorProps {
  companyCode: CompanyCode | "";
  selectedAreas: string[];
  onChange: (areas: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiAreaSelector({
  companyCode,
  selectedAreas,
  onChange,
  placeholder = "Selecionar áreas...",
  className,
}: MultiAreaSelectorProps) {
  const areas = getAreasFor(companyCode as CompanyCode);

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
          <div className="flex flex-wrap gap-1 items-center overflow-hidden">
            {selectedAreas.length > 0 ? (
              selectedAreas.map((slug) => (
                <AreaBadge 
                  key={slug} 
                  companyCode={companyCode as CompanyCode} 
                  areaSlug={slug}
                  className="mr-1"
                />
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 space-y-2">
          {areas.length === 0 ? (
            <div className="text-sm text-muted-foreground p-2 text-center">
              Selecione uma empresa primeiro.
            </div>
          ) : (
            areas.map((area) => (
              <div
                key={area.slug}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                onClick={() => toggleArea(area.slug)}
              >
                <Checkbox
                  id={`area-${area.slug}`}
                  checked={selectedAreas.includes(area.slug)}
                  onCheckedChange={() => toggleArea(area.slug)}
                />
                <Label
                  htmlFor={`area-${area.slug}`}
                  className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {area.label}
                </Label>
              </div>
            ))
          )}
        </div>
        {selectedAreas.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-8"
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
