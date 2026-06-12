import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Save, Calculator, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DevisPricingManagerProps {
  devisId: string;
  currentTotal: number;
  pricingStatus: string;
  onTotalUpdate: (newTotal: number) => void;
}

export const PRICING_STATUS_LABELS: Record<string, string> = {
  sem_precificacao: "Sem precificação",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  aprovada: "Aprovada",
};

export const PRICING_STATUS_COLORS: Record<string, string> = {
  sem_precificacao: "bg-slate-100 text-slate-700 border-slate-200",
  em_andamento: "bg-amber-100 text-amber-700 border-amber-200",
  concluida: "bg-blue-100 text-blue-700 border-blue-200",
  aprovada: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function DevisPricingManager({ devisId, currentTotal, pricingStatus, onTotalUpdate }: DevisPricingManagerProps) {
  const queryClient = useQueryClient();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const { data: pricingItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["devis-pricing-items", devisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devis_pricing_items")
        .select("*")
        .eq("devis_id", devisId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: servicePrices = [] } = useQuery({
    queryKey: ["service_prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_prices")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalCalculated = useMemo(() => {
    return pricingItems.reduce((sum, item) => sum + Number(item.total_price), 0);
  }, [pricingItems]);

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("devis")
        .update({ 
          pricing_status: newStatus,
          pricing_total: totalCalculated,
          total_amount: newStatus === "aprovada" ? totalCalculated : undefined
        })
        .eq("id", devisId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(`Status de precificação alterado para: ${PRICING_STATUS_LABELS[variables]}`);
      if (variables === "aprovada") {
        onTotalUpdate(totalCalculated);
      }
      queryClient.invalidateQueries({ queryKey: ["devis", devisId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async (serviceId: string) => {
      const service = servicePrices.find(s => s.id === serviceId);
      if (!service) return;

      const { error } = await supabase
        .from("devis_pricing_items")
        .insert({
          devis_id: devisId,
          service_price_id: service.id,
          name: service.name,
          description: service.description,
          unit_price: service.price,
          total_price: service.price,
          quantity: 1
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item adicionado!");
      setIsAddingItem(false);
      setSelectedServiceId("");
      queryClient.invalidateQueries({ queryKey: ["devis-pricing-items", devisId] });
      if (pricingStatus === "sem_precificacao") {
        updateStatus.mutate("em_andamento");
      }
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("devis_pricing_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item removido");
      queryClient.invalidateQueries({ queryKey: ["devis-pricing-items", devisId] });
    },
  });

  return (
    <Card className="border-primary/20 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 border-b py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Composição de Preços</CardTitle>
              <CardDescription className="text-xs">Detalhamento dos valores do Devis</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-xs px-2 py-0.5", PRICING_STATUS_COLORS[pricingStatus])}>
            {PRICING_STATUS_LABELS[pricingStatus] || pricingStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/10">
              <TableHead className="py-3">Serviço</TableHead>
              <TableHead className="py-3">Área / Empresa</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Unitário</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingItems ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
            ) : pricingItems.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm italic">Nenhum item de precificação adicionado.</TableCell></TableRow>
            ) : (
              pricingItems.map((item) => {
                const sp = servicePrices.find(s => s.id === item.service_price_id);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          {sp?.business_unit && <Badge variant="outline" className="text-[8px] h-3.5 px-1 uppercase">{sp.business_unit}</Badge>}
                          {sp?.responsible_sector && <Badge variant="secondary" className="text-[8px] h-3.5 px-1">{sp.responsible_sector}</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <div className="flex items-center justify-end gap-1">
                        <Input 
                          type="number" 
                          className="w-12 h-7 text-[10px] px-1 py-0 text-right" 
                          defaultValue={item.quantity || 1}
                          onBlur={async (e) => {
                            const val = Number(e.target.value);
                            if (val > 0 && val !== item.quantity) {
                              const newTotal = val * Number(item.unit_price || 0);
                              await supabase.from("devis_pricing_items").update({ quantity: val, total_price: newTotal }).eq("id", item.id);
                              queryClient.invalidateQueries({ queryKey: ["devis-pricing-items", devisId] });
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] text-muted-foreground">R$</span>
                        <Input 
                          type="number" 
                          step="0.01"
                          className="w-20 h-7 text-[10px] px-1 py-0 text-right" 
                          defaultValue={Number(item.unit_price || 0).toFixed(2)}
                          onBlur={async (e) => {
                            const val = Number(e.target.value);
                            if (val >= 0 && val !== Number(item.unit_price || 0)) {
                              const newTotal = val * (item.quantity || 1);
                              await supabase.from("devis_pricing_items").update({ unit_price: val, total_price: newTotal }).eq("id", item.id);
                              queryClient.invalidateQueries({ queryKey: ["devis-pricing-items", devisId] });
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold font-mono">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.total_price)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem.mutate(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="p-4 bg-muted/5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total Precificado</span>
            <span className="text-xl font-bold font-mono text-primary">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCalculated)}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <Plus className="h-4 w-4" /> Adicionar Serviço
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Selecionar Serviço da Tabela</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Serviço</Label>
                    <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um serviço..." />
                      </SelectTrigger>
                      <SelectContent>
                        {servicePrices.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.price)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsAddingItem(false)}>Cancelar</Button>
                  <Button onClick={() => addItem.mutate(selectedServiceId)} disabled={!selectedServiceId || addItem.isPending}>
                    Adicionar ao Devis
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {pricingStatus !== "aprovada" && pricingItems.length > 0 && (
              <Button size="sm" className="h-9 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus.mutate("aprovada")}>
                <CheckCircle2 className="h-4 w-4" /> Aprovar e Aplicar
              </Button>
            )}

            {pricingStatus === "aprovada" && totalCalculated !== currentTotal && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-xs animate-pulse">
                <AlertCircle className="h-3.5 w-3.5" />
                Divergência de valor
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
