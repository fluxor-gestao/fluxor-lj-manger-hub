import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCcw, AlertTriangle, CheckCircle2, History } from "lucide-react";
import { COMPANY_LIST, type CompanyCode } from "@/lib/companyCodes";
import { getAreasFor } from "@/lib/businessAreas";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface BulkPriceUpdateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: any[];
}

type UpdateCriteria = "manual" | "inflation" | "minimum_wage" | "tax_reform";

export default function BulkPriceUpdate({ open, onOpenChange, services }: BulkPriceUpdateProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [criteria, setCriteria] = useState<UpdateCriteria>("manual");
  const [percentage, setPercentage] = useState<string>("0");
  const [updating, setUpdating] = useState(false);
  
  // Filtros
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = useMemo(() => {
    return Array.from(new Set(services.map(s => s.category))).sort();
  }, [services]);

  const areas = useMemo(() => {
    if (filterUnit === "all") return [];
    return getAreasFor(filterUnit as CompanyCode);
  }, [filterUnit]);

  const filteredItems = useMemo(() => {
    return services.filter(s => {
      const unitMatch = filterUnit === "all" || s.business_unit === filterUnit;
      const areaMatch = filterArea === "all" || s.responsible_sector === filterArea;
      const catMatch = filterCategory === "all" || s.category === filterCategory;
      return unitMatch && areaMatch && catMatch;
    });
  }, [services, filterUnit, filterArea, filterCategory]);

  const previewItems = useMemo(() => {
    const pct = Number(percentage) || 0;
    return filteredItems.map(s => ({
      ...s,
      newPrice: s.price * (1 + pct / 100)
    }));
  }, [filteredItems, percentage]);

  const handleApply = async () => {
    if (previewItems.length === 0) return;
    setUpdating(true);
    try {
      const pct = Number(percentage) || 0;
      
      // 1. Atualizar serviços no banco
      for (const item of previewItems) {
        const { error } = await supabase
          .from("service_prices")
          .update({ price: item.newPrice })
          .eq("id", item.id);
        if (error) throw error;
      }

      // 2. Registrar no histórico
      const { error: histError } = await supabase
        .from("service_price_history")
        .insert({
          user_id: user?.id,
          criteria,
          percentage_applied: pct,
          items_count: previewItems.length,
          details: {
            filterUnit,
            filterArea,
            filterCategory,
            items: previewItems.map(i => ({ id: i.id, name: i.name, oldPrice: i.price, newPrice: i.newPrice }))
          }
        });
      if (histError) throw histError;

      toast.success(`${previewItems.length} serviços atualizados com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["service_prices"] });
      onOpenChange(false);
      setStep(1);
    } catch (e: any) {
      toast.error("Erro ao aplicar reajuste: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const criteriaLabels: Record<UpdateCriteria, string> = {
    manual: "Reajuste manual",
    inflation: "Inflação (IPCA/IGP-M)",
    minimum_wage: "Salário Mínimo",
    tax_reform: "Carga Tributária",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-primary" /> Atualização em Lote
          </DialogTitle>
          <DialogDescription>
            Aplique reajustes percentuais em múltiplos serviços simultaneamente.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Critérios de Reajuste
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Tipo de Reajuste</Label>
                    <Select value={criteria} onValueChange={(v) => setCriteria(v as UpdateCriteria)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Percentual manual</SelectItem>
                        <SelectItem value="inflation">Inflação (IPCA/IGP-M)</SelectItem>
                        <SelectItem value="minimum_wage">Salário Mínimo</SelectItem>
                        <SelectItem value="tax_reform">Carga/Reforma Tributária</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Percentual de Reajuste (%)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={percentage}
                      onChange={e => setPercentage(e.target.value)}
                      placeholder="Ex: 5.5"
                    />
                    <p className="text-[10px] text-muted-foreground italic">Use valores negativos para redução.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Filtros de Aplicação</h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Unidade de Negócio</Label>
                    <Select value={filterUnit} onValueChange={v => { setFilterUnit(v); setFilterArea("all"); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as unidades</SelectItem>
                        {COMPANY_LIST.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.short}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {filterUnit !== "all" && (
                    <div className="space-y-1.5">
                      <Label>Área Responsável</Label>
                      <Select value={filterArea} onValueChange={setFilterArea}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as áreas</SelectItem>
                          {areas.map(a => (
                            <SelectItem key={a.slug} value={a.slug}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Categoria</Label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <RefreshCcw className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{filteredItems.length} serviços selecionados</p>
                  <p className="text-xs text-muted-foreground">Reajuste de {percentage}% por {criteriaLabels[criteria]}</p>
                </div>
              </div>
              <Button onClick={() => setStep(2)} disabled={filteredItems.length === 0 || !percentage}>
                Visualizar Reajuste
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Confira os novos valores antes de confirmar. Esta ação não pode ser desfeita.</span>
              </div>
              <Badge variant="outline" className="border-amber-200 text-amber-800 bg-amber-100">
                {criteriaLabels[criteria]} (+{percentage}%)
              </Badge>
            </div>

            <div className="rounded-md border overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Valor Atual</TableHead>
                    <TableHead className="text-right">Ajuste</TableHead>
                    <TableHead className="text-right">Novo Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[200px] truncate font-medium">{item.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.price)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">
                        +{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.newPrice - item.price)}
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-primary">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.newPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={updating}>Voltar aos filtros</Button>
              <Button onClick={handleApply} disabled={updating} className="gap-2">
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar Reajuste em Lote
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const Badge = ({ children, variant, className }: any) => (
  <span className={cn(
    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
    variant === "outline" ? "border" : "bg-primary text-primary-foreground",
    className
  )}>
    {children}
  </span>
);
