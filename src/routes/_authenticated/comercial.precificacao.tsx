import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Sparkles, Pencil, Trash2, ArrowLeft, Loader2, Globe, Filter, RefreshCcw, History } from "lucide-react";
import { LoadingState, EmptyState } from "@/components/DataStates";
import { cn } from "@/lib/utils";
import BulkPriceUpdate from "@/components/devis/BulkPriceUpdate";
import { COMPANY_LIST, type CompanyCode } from "@/lib/companyCodes";
import { AreaBadge } from "@/components/AreaBadge";

export const Route = createFileRoute("/_authenticated/comercial/precificacao")({
  component: Precificacao,
});


type ServicePrice = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  business_unit: CompanyCode | null;
  responsible_sector: string | null;
};

function Precificacao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<ServicePrice> | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["service_prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_prices")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data as any[]).map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        category: s.category || "Geral",
        price: s.price || 0,
        business_unit: s.business_unit as CompanyCode | null,
        responsible_sector: s.responsible_sector as string | null,
      })) as ServicePrice[];
    },
  });

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category));
    return Array.from(cats).sort();
  }, [services]);

  const saveService = useMutation({
    mutationFn: async (service: Partial<ServicePrice>) => {
      if (!service.name) throw new Error("O nome do serviço é obrigatório.");
      
      const payload = {
        name: service.name,
        description: service.description || null,
        category: service.category || "Geral",
        price: service.price || 0,
      };

      if (service.id) {
        const { error } = await supabase
          .from("service_prices")
          .update(payload)
          .eq("id", service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("service_prices")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Serviço salvo!");
      queryClient.invalidateQueries({ queryKey: ["service_prices"] });
      setIsDialogOpen(false);
      setEditingService(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_prices")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço excluído!");
      queryClient.invalidateQueries({ queryKey: ["service_prices"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["service_price_history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_price_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display">Tabela de Preços</h1>
          <p className="text-muted-foreground mt-1">Gestão de precificação e análise de mercado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/comercial" })}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <Button variant="outline" onClick={() => setIsBulkUpdateOpen(true)}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Atualização em Lote
          </Button>
          <Button variant="outline" onClick={() => setIsHistoryOpen(true)}>
            <History className="h-4 w-4 mr-2" /> Histórico
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingService(null)}>
                <Plus className="h-4 w-4 mr-2" /> Novo Serviço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingService?.id ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade de Negócio</Label>
                  <Select 
                    value={editingService?.business_unit || ""} 
                    onValueChange={v => setEditingService(prev => ({ ...prev, business_unit: v as CompanyCode }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar unidade" /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_LIST.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Serviço</Label>
                  <Input 
                    id="name" 
                    value={editingService?.name || ""} 
                    onChange={e => setEditingService(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input 
                    id="category" 
                    value={editingService?.category || ""} 
                    onChange={e => setEditingService(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input 
                    id="price" 
                    type="number"
                    value={editingService?.price || ""} 
                    onChange={e => setEditingService(prev => ({ ...prev, price: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea 
                    id="description" 
                    value={editingService?.description || ""} 
                    onChange={e => setEditingService(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => saveService.mutate(editingService!)}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <BulkPriceUpdate 
        open={isBulkUpdateOpen} 
        onOpenChange={setIsBulkUpdateOpen} 
        services={services} 
      />

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Reajustes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum histórico registrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Critério</TableHead>
                    <TableHead className="text-right">Reajuste</TableHead>
                    <TableHead className="text-right">Itens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{new Date(h.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-xs font-medium">{h.criteria}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{h.percentage_applied}%</TableCell>
                      <TableCell className="text-right text-xs">{h.items_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card className="p-4">
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por serviço ou descrição..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="gap-2 shrink-0">
              <Globe className="h-4 w-4" /> Busca de Mercado
            </Button>
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : filteredServices.length === 0 ? (
          <EmptyState title="Nenhum serviço encontrado" description="Cadastre novos serviços ou ajuste sua busca." />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço de Tabela</TableHead>
                  <TableHead className="text-right">Preço de Mercado (IA)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{service.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>{service.category}</TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono text-emerald-600">
                          {service.market_price 
                            ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.market_price) 
                            : "—"}
                        </span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-primary"
                          onClick={() => handleAiMarketSearch(service.name)}
                          disabled={isAiSearching}
                        >
                          <Sparkles className={cn("h-4 w-4", isAiSearching && "animate-spin")} />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => {
                            setEditingService(service);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-destructive"
                          onClick={() => deleteService.mutate(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
