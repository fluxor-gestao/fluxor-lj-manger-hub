import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ArrowLeft, Filter, Search, Building2 } from "lucide-react";
import { toast } from "sonner";
import { COMPANY_LIST } from "@/lib/companyCodes";

export const Route = createFileRoute("/_authenticated/comercial/areas")({
  component: AreasManager,
});

function AreasManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState<string>("all");
  
  // Form state
  const [label, setLabel] = useState("");
  const [businessUnit, setBusinessUnit] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ["business-areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_areas")
        .select("*")
        .order("business_unit", { ascending: true })
        .order("display_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: areaUsage = {} } = useQuery({
    queryKey: ["business-areas-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devis_service_areas")
        .select("area_slug");
      if (error) throw error;
      
      const usage: Record<string, number> = {};
      data?.forEach(d => {
        usage[d.area_slug] = (usage[d.area_slug] || 0) + 1;
      });
      return usage;
    },
  });

  const filteredAreas = useMemo(() => {
    return areas.filter(a => {
      const matchesSearch = (a.label || a.name || "").toLowerCase().includes(search.toLowerCase());
      const matchesUnit = filterUnit === "all" || a.business_unit === filterUnit;
      return matchesSearch && matchesUnit;
    });
  }, [areas, search, filterUnit]);

  const saveArea = useMutation({
    mutationFn: async () => {
      const slug = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^\w]/g, "");
      const payload: any = {
        label,
        name: label,
        business_unit: businessUnit,
        slug,
        description,
        display_order: parseInt(displayOrder) || 0,
        is_active: isActive,
      };

      if (editingArea) {
        const { error } = await supabase
          .from("business_areas")
          .update(payload)
          .eq("id", editingArea.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_areas")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingArea ? "Área atualizada!" : "Área criada!");
      queryClient.invalidateQueries({ queryKey: ["business-areas"] });
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteArea = useMutation({
    mutationFn: async (id: string) => {
      const area = areas.find((a: any) => a.id === id);
      if (area && areaUsage[area.slug]) {
        throw new Error(`Não é possível excluir a área "${area.label || area.name}" pois ela possui ${areaUsage[area.slug]} Devis vinculado(s). Inative-a em vez de excluir.`);
      }
      const { error } = await supabase
        .from("business_areas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Área removida!");
      queryClient.invalidateQueries({ queryKey: ["business-areas"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setEditingArea(null);
    setLabel("");
    setBusinessUnit("");
    setDescription("");
    setDisplayOrder("0");
    setIsActive(true);
  };

  const handleEdit = (area: any) => {
    setEditingArea(area);
    setLabel(area.label || area.name);
    setBusinessUnit(area.business_unit || "");
    setDescription(area.description || "");
    setDisplayOrder(String(area.display_order));
    setIsActive(area.is_active);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Catálogo de Áreas</h1>
          <p className="text-muted-foreground mt-1">Gestão oficial de unidades e setores comerciais</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/comercial" })}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova Área</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingArea ? "Editar Área" : "Nova Área"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Unidade de Negócio</Label>
                  <Select value={businessUnit} onValueChange={setBusinessUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_LIST.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome da área</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Migratório, TI..." />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição da área" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ordem de exibição</Label>
                    <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Switch checked={isActive} onCheckedChange={setIsActive} id="area-active" />
                    <Label htmlFor="area-active">Ativo</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => saveArea.mutate()} disabled={!label || !businessUnit || saveArea.isPending}>
                  {saveArea.isPending ? "Salvando..." : "Salvar Área"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome da área..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={filterUnit} onValueChange={setFilterUnit}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todas as Unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Unidades</SelectItem>
                {COMPANY_LIST.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.short}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Plus className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="rounded-md border border-muted">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Cód. Unidade</TableHead>
                  <TableHead>Unidade de Negócio</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAreas.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhuma área encontrada.</TableCell></TableRow>
                ) : (
                  filteredAreas.map((area: any) => (
                    <TableRow key={area.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Badge variant="secondary" className="font-mono font-bold">
                          {area.business_unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {COMPANY_LIST.find(c => c.code === area.business_unit)?.short || area.business_unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{area.label || area.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{area.slug}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{area.display_order}</TableCell>
                      <TableCell>
                        <Badge variant={area.is_active ? "default" : "outline"} className={area.is_active ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : "text-muted-foreground"}>
                          {area.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] bg-blue-500/5 text-blue-600 border-blue-500/20">
                          {areaUsage[area.slug] || 0} Devis
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(area)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja realmente excluir a área <strong>{area.label || area.name}</strong>? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteArea.mutate(area.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Excluir permanentemente</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
