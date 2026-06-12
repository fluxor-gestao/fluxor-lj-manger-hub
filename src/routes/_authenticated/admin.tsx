import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, ScrollText, Plus, Pencil, Trash2, Settings, Building2, BriefcaseBusiness, WalletCards, ShieldCheck, Save, Bell, Palette, Hash, SlidersHorizontal, KeyRound, Briefcase, ListTodo, FileSpreadsheet, History, CheckCircle2, AlertCircle, Sparkles, Calendar, Database, Download, ShieldAlert, Loader2, Activity } from "lucide-react";
import { SystemDiagnostics } from "@/components/admin/SystemDiagnostics";
import { DevisSequenceManager } from "@/components/devis/DevisSequenceManager";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type SystemSettings = {
  companyName: string;
  companyDocument: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  systemDisplayName: string;
  primaryColor: string;
  footerText: string;
  supportEmail: string;
  proposalPrefix: string;
  proposalValidityDays: string;
  proposalDownPaymentPercent: string;
  proposalFinalPaymentPercent: string;
  proposalTemplate: string;
  proposalTerms: string;
  proposalExecutionDeadline: string;
  proposalWarranty: string;
  proposalSignature: string;
  proposalSequence: string;
  proposalNumberFormat: string;
  financialEntryPrefix: string;
  servicePrefix: string;
  defaultCurrency: string;
  defaultBankAccount: string;
  defaultCostCenter: string;
  defaultIncomeCategory: string;
  defaultExpenseCategory: string;
  defaultDueDay: string;
  requireBusinessUnit: boolean;
  requireCostCenter: boolean;
  requireEntryDescription: boolean;
  allowRetroactiveEntries: boolean;
  conciliationDayTolerance: string;
  conciliationValueTolerance: string;
  conciliationAutoSuggest: boolean;
  conciliationAutoApproveExact: boolean;
  conciliationBlockDivergent: boolean;
  conciliationWeightValue: string;
  conciliationWeightDate: string;
  conciliationWeightDescription: string;
  conciliationWeightDocument: string;
  defaultHomePage: string;
  auditSensitiveChanges: boolean;
  administrativeNotifications: boolean;
  notifyProposalSent: boolean;
  notifyProposalAccepted: boolean;
  notifyProposalRejected: boolean;
  notifyPendingCharge: boolean;
  notifyDelayedService: boolean;
  notifyConciliationDivergence: boolean;
  notificationEmail: string;
  defaultLanguage: string;
  timezone: string;
  dateFormat: string;
  recordsPerPage: string;
  compactMode: boolean;
  confirmBeforeDelete: boolean;
  blockDeleteConciliatedEntries: boolean;
  logRetentionDays: string;
  allowLogExport: boolean;
  transactionalEmailEnabled: boolean;
  whatsappEnabled: boolean;
  bankImportEnabled: boolean;
  webhooksEnabled: boolean;
  externalBiEnabled: boolean;
};

const defaultSystemSettings: SystemSettings = {
  companyName: "",
  companyDocument: "",
  companyEmail: "",
  companyPhone: "",
  companyAddress: "",
  systemDisplayName: "",
  primaryColor: "primary",
  footerText: "",
  supportEmail: "",
  proposalPrefix: "DE",
  proposalValidityDays: "7",
  proposalDownPaymentPercent: "50",
  proposalFinalPaymentPercent: "50",
  proposalTemplate: "completo",
  proposalTerms: "",
  proposalExecutionDeadline: "",
  proposalWarranty: "",
  proposalSignature: "",
  proposalSequence: "1",
  proposalNumberFormat: "prefixo-ano-mes-sequencial",
  financialEntryPrefix: "FIN",
  servicePrefix: "SRV",
  defaultCurrency: "brl",
  defaultBankAccount: "",
  defaultCostCenter: "",
  defaultIncomeCategory: "",
  defaultExpenseCategory: "",
  defaultDueDay: "10",
  requireBusinessUnit: true,
  requireCostCenter: false,
  requireEntryDescription: true,
  allowRetroactiveEntries: true,
  conciliationDayTolerance: "3",
  conciliationValueTolerance: "1.00",
  conciliationAutoSuggest: true,
  conciliationAutoApproveExact: false,
  conciliationBlockDivergent: true,
  conciliationWeightValue: "40",
  conciliationWeightDate: "25",
  conciliationWeightDescription: "20",
  conciliationWeightDocument: "15",
  defaultHomePage: "hub",
  auditSensitiveChanges: true,
  administrativeNotifications: false,
  notifyProposalSent: false,
  notifyProposalAccepted: true,
  notifyProposalRejected: true,
  notifyPendingCharge: true,
  notifyDelayedService: true,
  notifyConciliationDivergence: true,
  notificationEmail: "",
  defaultLanguage: "pt-BR",
  timezone: "America/Sao_Paulo",
  dateFormat: "dd/MM/yyyy",
  recordsPerPage: "25",
  compactMode: false,
  confirmBeforeDelete: true,
  blockDeleteConciliatedEntries: true,
  logRetentionDays: "365",
  allowLogExport: true,
  transactionalEmailEnabled: false,
  whatsappEnabled: false,
  bankImportEnabled: false,
  webhooksEnabled: false,
  externalBiEnabled: false,
};

function BusinessUnitsManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["business-units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_units")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveUnit = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: code.toUpperCase(),
        name,
        description,
        active: isActive,
      };

      if (editingUnit) {
        const { error } = await supabase
          .from("business_units")
          .update(payload)
          .eq("id", editingUnit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_units")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingUnit ? "Unidade atualizada!" : "Unidade criada!");
      queryClient.invalidateQueries({ queryKey: ["business-units"] });
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("business_units")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unidade removida!");
      queryClient.invalidateQueries({ queryKey: ["business-units"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setEditingUnit(null);
    setCode("");
    setName("");
    setDescription("");
    setIsActive(true);
  };

  const handleEdit = (unit: any) => {
    setEditingUnit(unit);
    setCode(unit.code);
    setName(unit.name);
    setDescription(unit.description || "");
    setIsActive(unit.active);
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Listagem de Unidades</CardTitle>
          <CardDescription>Gerencie as unidades de negócio do grupo.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Unidade</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUnit ? "Editar Unidade" : "Nova Unidade"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sigla / Código</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: DE, AM..." maxLength={4} />
                </div>
                <div className="space-y-2">
                  <Label>Nome da Unidade</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Direito Estratégico" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição da unidade" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} id="unit-active" />
                <Label htmlFor="unit-active">Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveUnit.mutate()} disabled={!code || !name || saveUnit.isPending}>
                {saveUnit.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando unidades...</TableCell></TableRow>
            ) : units.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma unidade cadastrada.</TableCell></TableRow>
            ) : (
              units.map((unit: any) => (
                <TableRow key={unit.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-bold">{unit.code}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>
                    <Badge variant={unit.active ? "default" : "secondary"}>
                      {unit.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(unit)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir unidade?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação removerá a unidade de negócio. Verifique se não há áreas vinculadas.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteUnit.mutate(unit.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Excluir</AlertDialogAction>
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
      </CardContent>
    </Card>
  );
}

function BusinessAreasManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<any>(null);
  const [label, setLabel] = useState("");
  const [businessUnit, setBusinessUnit] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const { data: units = [] } = useQuery({
    queryKey: ["business-units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_units")
        .select("*")
        .eq("active", true)
        .order("code", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

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

  const saveArea = useMutation({
    mutationFn: async () => {
      const slug = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^\w]/g, "");
      const payload: any = {
        label,
        name: label, // keep name for backward compatibility
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
        throw new Error(`Não é possível excluir a área "${area.label}" pois ela possui ${areaUsage[area.slug]} Devis vinculado(s). Inative-a em vez de excluir.`);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Listagem de Áreas</CardTitle>
          <CardDescription>Cadastre as áreas/setores por Unidade de Negócio.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Área</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingArea ? "Editar Área" : "Nova Área"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unidade de Negócio</Label>
                  <Select value={businessUnit} onValueChange={setBusinessUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit: any) => (
                        <SelectItem key={unit.id} value={unit.code}>
                          {unit.code} — {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome da área</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Migratório, TI..." />
                </div>
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
                {saveArea.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidade</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Ordem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando áreas...</TableCell></TableRow>
            ) : areas.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma área cadastrada.</TableCell></TableRow>
            ) : (
              areas.map((area: any) => (
                <TableRow key={area.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-bold">
                      {area.business_unit}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{area.label || area.name}</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{area.slug}</TableCell>
                  <TableCell className="font-mono text-xs">{area.display_order}</TableCell>
                  <TableCell>
                    <Badge variant={area.is_active ? "default" : "secondary"}>
                      {area.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {areaUsage[area.slug] || 0} Devis
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(area)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir área?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A área será permanentemente removida.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteArea.mutate(area.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Excluir</AlertDialogAction>
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
      </CardContent>
    </Card>
  );
}

function BackupManager() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const { user } = useAuth();

  const steps = [
    "Validando permissão",
    "Coletando dados",
    "Gerando CSVs",
    "Compactando arquivo",
    "Preparando download"
  ];

  const handleGenerateBackup = async () => {
    setIsGenerating(true);
    setStep(0);

    try {
      // Fake progress for visual feedback
      const interval = setInterval(() => {
        setStep(prev => (prev < 4 ? prev + 1 : prev));
      }, 1500);

      const { data, error } = await supabase.functions.invoke("generate-system-backup");
      
      clearInterval(interval);
      setStep(4);

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_sistema_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Backup gerado com sucesso!");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao gerar backup: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsGenerating(false);
      setStep(0);
    }
  };

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Backup Geral do Sistema</CardTitle>
            <CardDescription>Exporte todas as informações operacionais e financeiras em formato CSV (ZIP).</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Atenção: Informações Sensíveis</p>
            <p className="opacity-90">
              Este arquivo conterá dados confidenciais de clientes, propostas, lançamentos financeiros e usuários. 
              Mantenha o arquivo em local seguro após o download.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Dados Incluídos
            </h4>
            <ul className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
              <li>• Clientes & Áreas</li>
              <li>• Devis & Propostas</li>
              <li>• Mapa de Aprovação</li>
              <li>• Tarefas & Comentários</li>
              <li>• Financeiro & Lançamentos</li>
              <li>• Contas a Receber/Pagar</li>
              <li>• Histórico de E-mails</li>
              <li>• Metadados de Anexos</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Segurança
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Senhas não são exportadas</li>
              <li>• Chaves de API ocultas</li>
              <li>• Acesso restrito a administradores</li>
              <li>• Registro de log da operação</li>
            </ul>
          </div>
        </div>

        {isGenerating && (
          <div className="space-y-3 py-4 border-t border-b border-dashed">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Processando...
              </span>
              <span className="text-xs text-muted-foreground">{Math.round(((step + 1) / 5) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-in-out" 
                style={{ width: `${((step + 1) / 5) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider font-semibold">
              Etapa {step + 1}: {steps[step]}
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isGenerating} size="lg" className="bg-primary hover:bg-primary/90">
                <Download className="h-4 w-4 mr-2" />
                Gerar Backup Geral
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  Confirmar Exportação Geral
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Este backup contém informações sensíveis de todo o sistema, incluindo dados financeiros e de clientes.
                  O download pode demorar alguns minutos dependendo do volume de dados.
                  <br /><br />
                  Deseja continuar com a geração do arquivo ZIP?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleGenerateBackup}>Confirmar e Gerar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function Admin() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ user_id: string; currentRole: string } | null>(null);
  const [newRole, setNewRole] = useState("gerencial");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ user_id: string; label: string } | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetPwdConfirm, setResetPwdConfirm] = useState("");

  // Form state for creating user
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("gerencial");
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSystemSettings((current) => ({ ...current, [key]: value }));
  };

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const usersLoading = isLoading || isLoadingRoles;

  const { data: logs = [] } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: savedSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["system-settings", "general"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("settings")
        .eq("category", "general")
        .maybeSingle();
      if (error) throw error;
      return data?.settings as Partial<SystemSettings> | undefined;
    },
  });

  useEffect(() => {
    if (savedSettings) {
      setSystemSettings({ ...defaultSystemSettings, ...savedSettings });
    }
  }, [savedSettings]);

  const getUserRole = (userId: string): string => {
    const r = roles.find((r) => r.user_id === userId);
    return r?.role ?? "—";
  };

  const invokeManageUsers = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-users", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const createUser = useMutation({
    mutationFn: () =>
      invokeManageUsers({
        action: "create",
        email: formEmail,
        password: formPassword,
        full_name: formName,
        role: formRole,
      }),
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setCreateOpen(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormRole("gerencial");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateRole = useMutation({
    mutationFn: ({ user_id, role }: { user_id: string; role: string }) =>
      invokeManageUsers({ action: "update-role", user_id, role }),
    onSuccess: async () => {
      toast.success("Perfil atualizado!");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-roles"] }),
      ]);
      setEditOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteUser = useMutation({
    mutationFn: (user_id: string) =>
      invokeManageUsers({ action: "delete", user_id }),
    onSuccess: () => {
      toast.success("Usuário removido!");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetPassword = useMutation({
    mutationFn: ({ user_id, new_password }: { user_id: string; new_password: string }) =>
      invokeManageUsers({ action: "reset-password", user_id, new_password }),
    onSuccess: () => {
      toast.success("Senha redefinida!");
      setResetOpen(false);
      setResetPwd("");
      setResetPwdConfirm("");
      setResetTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("system_settings").upsert({
        category: "general",
        settings: systemSettings,
        updated_by: user?.id,
      }, { onConflict: "category" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opções do sistema salvas!");
      queryClient.invalidateQueries({ queryKey: ["system-settings", "general"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display">Opções / Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerencie usuários e perfis do sistema</p>
        </div>
        <Button variant="outline" onClick={() => (window.location.href = "/admin/api-keys")}>
          <KeyRound className="h-4 w-4 mr-2" /> API Keys (BI)
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6" value={new URLSearchParams(window.location.search).get('tab') || 'users'} onValueChange={(v) => (window.location.href = `/admin?tab=${v}`)}>
        <TabsList className="bg-slate-100 border border-slate-200 p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="users" className="gap-2 px-4 py-2 font-bold uppercase text-[10px] tracking-widest"><Users className="h-3.5 w-3.5" />Usuários</TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-2 px-4 py-2 font-bold uppercase text-[10px] tracking-widest"><Activity className="h-3.5 w-3.5" />Diagnóstico</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 px-4 py-2 font-bold uppercase text-[10px] tracking-widest"><ScrollText className="h-3.5 w-3.5" />Logs</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 px-4 py-2 font-bold uppercase text-[10px] tracking-widest"><Settings className="h-3.5 w-3.5" />Opções</TabsTrigger>
          <TabsTrigger value="units" className="gap-2 px-4 py-2 font-bold uppercase text-[10px] tracking-widest"><Building2 className="h-3.5 w-3.5" />Unidades</TabsTrigger>
          <TabsTrigger value="areas" className="gap-2 px-4 py-2 font-bold uppercase text-[10px] tracking-widest"><Briefcase className="h-3.5 w-3.5" />Áreas</TabsTrigger>
          <TabsTrigger value="commercial-settings" className="gap-2 px-4 py-2 font-bold uppercase text-[10px] tracking-widest"><FileSpreadsheet className="h-3.5 w-3.5" />Comercial</TabsTrigger>
          <TabsTrigger value="updates" className="gap-2 px-4 py-2 font-bold uppercase text-[10px] tracking-widest"><History className="h-3.5 w-3.5" />Versões</TabsTrigger>
          <TabsTrigger value="backup" className="gap-2 px-4 py-2 font-bold uppercase text-[10px] tracking-widest"><Database className="h-3.5 w-3.5" />Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createUser.mutate();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label>Perfil</Label>
                    <Select value={formRole} onValueChange={setFormRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="operacao">Operação</SelectItem>
                        <SelectItem value="gerencial">Gerencial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createUser.isPending}>
                      {createUser.isPending ? "Criando..." : "Criar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Role Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alterar Perfil</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Novo Perfil</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="operacao">Operação</SelectItem>
                      <SelectItem value="gerencial">Gerencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button
                    disabled={updateRole.isPending}
                    onClick={() => {
                      if (editTarget) updateRole.mutate({ user_id: editTarget.user_id, role: newRole });
                    }}
                  >
                    {updateRole.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* Reset Password Dialog */}
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Redefinir senha</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (resetPwd !== resetPwdConfirm) {
                    toast.error("As senhas não coincidem");
                    return;
                  }
                  if (resetTarget) {
                    resetPassword.mutate({ user_id: resetTarget.user_id, new_password: resetPwd });
                  }
                }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Definir nova senha para <strong>{resetTarget?.label}</strong>.
                </p>
                <div className="space-y-2">
                  <Label>Nova senha</Label>
                  <Input type="password" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar nova senha</Label>
                  <Input type="password" value={resetPwdConfirm} onChange={(e) => setResetPwdConfirm(e.target.value)} required minLength={6} />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={resetPassword.isPending}>
                    {resetPassword.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : profiles.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum usuário</TableCell></TableRow>
                ) : (
                  profiles.map((p) => {
                    const role = getUserRole(p.user_id);
                    const isSelf = p.user_id === user?.id;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell>
                          <Badge variant={role === "admin" ? "default" : "secondary"}>
                            {role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditTarget({ user_id: p.user_id, currentRole: role });
                                setNewRole(["admin","comercial","financeiro","operacao","gerencial"].includes(role) ? role : "gerencial");
                                setEditOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Redefinir senha"
                              onClick={() => {
                                setResetTarget({ user_id: p.user_id, label: p.full_name || p.email || "usuário" });
                                setResetPwd("");
                                setResetPwdConfirm("");
                                setResetOpen(true);
                              }}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            {!isSelf && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o usuário <strong>{p.full_name || p.email}</strong>? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteUser.mutate(p.user_id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum log registrado</TableCell></TableRow>
                ) : logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-sm">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{l.action}</TableCell>
                    <TableCell>{l.entity_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{JSON.stringify(l.details)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  Dados da Empresa
                </CardTitle>
                <CardDescription>Informações usadas em propostas, relatórios e documentos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome da empresa</Label>
                    <Input value={systemSettings.companyName} onChange={(e) => updateSetting("companyName", e.target.value)} placeholder="Lundgaard" />
                  </div>
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input value={systemSettings.companyDocument} onChange={(e) => updateSetting("companyDocument", e.target.value)} placeholder="00.000.000/0000-00" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>E-mail institucional</Label>
                    <Input type="email" value={systemSettings.companyEmail} onChange={(e) => updateSetting("companyEmail", e.target.value)} placeholder="contato@empresa.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={systemSettings.companyPhone} onChange={(e) => updateSetting("companyPhone", e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Textarea value={systemSettings.companyAddress} onChange={(e) => updateSetting("companyAddress", e.target.value)} placeholder="Endereço completo da empresa" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-secondary/40 to-primary/10">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Palette className="h-5 w-5 text-primary" />
                  Identidade Visual
                </CardTitle>
                <CardDescription>Nome, aparência e contatos exibidos no sistema.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome exibido no sistema</Label>
                    <Input value={systemSettings.systemDisplayName} onChange={(e) => updateSetting("systemDisplayName", e.target.value)} placeholder="Hub Manager" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor principal</Label>
                    <Select value={systemSettings.primaryColor} onValueChange={(value) => updateSetting("primaryColor", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Padrão</SelectItem>
                        <SelectItem value="accent">Destaque</SelectItem>
                        <SelectItem value="secondary">Neutra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>E-mail de suporte</Label>
                  <Input type="email" value={systemSettings.supportEmail} onChange={(e) => updateSetting("supportEmail", e.target.value)} placeholder="suporte@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label>Texto de rodapé</Label>
                  <Textarea value={systemSettings.footerText} onChange={(e) => updateSetting("footerText", e.target.value)} placeholder="Texto para PDFs, propostas e relatórios" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-accent/30 bg-gradient-to-br from-accent/10 to-secondary/40">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BriefcaseBusiness className="h-5 w-5 text-accent" />
                  Preferências Comerciais
                </CardTitle>
                <CardDescription>Parâmetros padrão para propostas e negociações.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prefixo da proposta</Label>
                    <Input value={systemSettings.proposalPrefix} onChange={(e) => updateSetting("proposalPrefix", e.target.value)} placeholder="DE" />
                  </div>
                  <div className="space-y-2">
                    <Label>Validade padrão</Label>
                    <Input type="number" value={systemSettings.proposalValidityDays} onChange={(e) => updateSetting("proposalValidityDays", e.target.value)} placeholder="7" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Entrada padrão (%)</Label>
                    <Input type="number" value={systemSettings.proposalDownPaymentPercent} onChange={(e) => updateSetting("proposalDownPaymentPercent", e.target.value)} placeholder="50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Saldo/finalização (%)</Label>
                    <Input type="number" value={systemSettings.proposalFinalPaymentPercent} onChange={(e) => updateSetting("proposalFinalPaymentPercent", e.target.value)} placeholder="50" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Modelo padrão</Label>
                    <Select value={systemSettings.proposalTemplate} onValueChange={(value) => updateSetting("proposalTemplate", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completo">Completo</SelectItem>
                        <SelectItem value="resumido">Resumido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável/assinatura padrão</Label>
                    <Input value={systemSettings.proposalSignature} onChange={(e) => updateSetting("proposalSignature", e.target.value)} placeholder="Nome do responsável" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Condições comerciais padrão</Label>
                  <Textarea value={systemSettings.proposalTerms} onChange={(e) => updateSetting("proposalTerms", e.target.value)} placeholder="Texto padrão exibido nas propostas" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prazo de execução padrão</Label>
                    <Textarea value={systemSettings.proposalExecutionDeadline} onChange={(e) => updateSetting("proposalExecutionDeadline", e.target.value)} placeholder="Ex.: até 10 dias úteis" />
                  </div>
                  <div className="space-y-2">
                    <Label>Garantia/observações padrão</Label>
                    <Textarea value={systemSettings.proposalWarranty} onChange={(e) => updateSetting("proposalWarranty", e.target.value)} placeholder="Texto de garantia ou observações" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-muted bg-gradient-to-br from-background to-secondary/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hash className="h-5 w-5 text-primary" />
                  Numeração e Documentos
                </CardTitle>
                <CardDescription>Formatos e prefixos usados em propostas, lançamentos e serviços.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Sequencial atual da proposta</Label>
                    <Input type="number" value={systemSettings.proposalSequence} onChange={(e) => updateSetting("proposalSequence", e.target.value)} placeholder="1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Formato do número</Label>
                    <Select value={systemSettings.proposalNumberFormat} onValueChange={(value) => updateSetting("proposalNumberFormat", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prefixo-ano-mes-sequencial">DE + Ano + Mês + Sequencial</SelectItem>
                        <SelectItem value="prefixo-ano-sequencial">DE + Ano + Sequencial</SelectItem>
                        <SelectItem value="sequencial-simples">Sequencial simples</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prefixo financeiro</Label>
                    <Input value={systemSettings.financialEntryPrefix} onChange={(e) => updateSetting("financialEntryPrefix", e.target.value)} placeholder="FIN" />
                  </div>
                  <div className="space-y-2">
                    <Label>Prefixo de serviço</Label>
                    <Input value={systemSettings.servicePrefix} onChange={(e) => updateSetting("servicePrefix", e.target.value)} placeholder="SRV" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-muted bg-gradient-to-br from-secondary/50 to-background">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <WalletCards className="h-5 w-5 text-primary" />
                  Configurações Financeiras
                </CardTitle>
                <CardDescription>Preferências para lançamentos e conciliação financeira.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Moeda padrão</Label>
                    <Select value={systemSettings.defaultCurrency} onValueChange={(value) => updateSetting("defaultCurrency", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brl">BRL</SelectItem>
                        <SelectItem value="usd">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tolerância de dias</Label>
                    <Input type="number" value={systemSettings.conciliationDayTolerance} onChange={(e) => updateSetting("conciliationDayTolerance", e.target.value)} placeholder="3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Conta bancária padrão</Label>
                  <Input value={systemSettings.defaultBankAccount} onChange={(e) => updateSetting("defaultBankAccount", e.target.value)} placeholder="Selecione ou informe a conta padrão" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Centro de custo padrão</Label>
                    <Input value={systemSettings.defaultCostCenter} onChange={(e) => updateSetting("defaultCostCenter", e.target.value)} placeholder="Centro de custo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Dia padrão de vencimento</Label>
                    <Input type="number" value={systemSettings.defaultDueDay} onChange={(e) => updateSetting("defaultDueDay", e.target.value)} placeholder="10" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Categoria padrão de entrada</Label>
                    <Input value={systemSettings.defaultIncomeCategory} onChange={(e) => updateSetting("defaultIncomeCategory", e.target.value)} placeholder="Receita operacional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria padrão de saída</Label>
                    <Input value={systemSettings.defaultExpenseCategory} onChange={(e) => updateSetting("defaultExpenseCategory", e.target.value)} placeholder="Despesa operacional" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-background/70 p-3">
                  <div>
                    <Label>Sugestões automáticas de conciliação</Label>
                    <p className="text-sm text-muted-foreground">Usar valor, data e descrição para sugerir vínculos.</p>
                  </div>
                  <Switch checked={systemSettings.conciliationAutoSuggest} onCheckedChange={(checked) => updateSetting("conciliationAutoSuggest", checked)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3">
                    <Label>Exigir unidade de negócio</Label>
                    <Switch checked={systemSettings.requireBusinessUnit} onCheckedChange={(checked) => updateSetting("requireBusinessUnit", checked)} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3">
                    <Label>Permitir retroativos</Label>
                    <Switch checked={systemSettings.allowRetroactiveEntries} onCheckedChange={(checked) => updateSetting("allowRetroactiveEntries", checked)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 to-background">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  Regras de Conciliação
                </CardTitle>
                <CardDescription>Critérios de compatibilidade entre extrato e lançamentos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tolerância de valor</Label>
                    <Input type="number" value={systemSettings.conciliationValueTolerance} onChange={(e) => updateSetting("conciliationValueTolerance", e.target.value)} placeholder="1.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tolerância de dias</Label>
                    <Input type="number" value={systemSettings.conciliationDayTolerance} onChange={(e) => updateSetting("conciliationDayTolerance", e.target.value)} placeholder="3" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-2"><Label>Peso valor</Label><Input type="number" value={systemSettings.conciliationWeightValue} onChange={(e) => updateSetting("conciliationWeightValue", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Peso data</Label><Input type="number" value={systemSettings.conciliationWeightDate} onChange={(e) => updateSetting("conciliationWeightDate", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Peso descrição</Label><Input type="number" value={systemSettings.conciliationWeightDescription} onChange={(e) => updateSetting("conciliationWeightDescription", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Peso documento</Label><Input type="number" value={systemSettings.conciliationWeightDocument} onChange={(e) => updateSetting("conciliationWeightDocument", e.target.value)} /></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Aprovar 100% automático</Label><Switch checked={systemSettings.conciliationAutoApproveExact} onCheckedChange={(checked) => updateSetting("conciliationAutoApproveExact", checked)} /></div>
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Bloquear divergentes</Label><Switch checked={systemSettings.conciliationBlockDivergent} onCheckedChange={(checked) => updateSetting("conciliationBlockDivergent", checked)} /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-destructive/20 bg-gradient-to-br from-destructive/10 to-background">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-destructive" />
                  Permissões e Segurança
                </CardTitle>
                <CardDescription>Controles administrativos, auditoria e notificações.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Página inicial padrão</Label>
                  <Select value={systemSettings.defaultHomePage} onValueChange={(value) => updateSetting("defaultHomePage", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hub">Hub</SelectItem>
                      <SelectItem value="bi">BI / Business Intelligence</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-background/70 p-3">
                  <div>
                    <Label>Registrar alterações sensíveis</Label>
                    <p className="text-sm text-muted-foreground">Auditar exclusões e mudanças de perfil.</p>
                  </div>
                  <Switch checked={systemSettings.auditSensitiveChanges} onCheckedChange={(checked) => updateSetting("auditSensitiveChanges", checked)} />
                </div>
                <div className="flex items-center justify-between rounded-md border bg-background/70 p-3">
                  <div className="flex items-start gap-2">
                    <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Notificações administrativas</Label>
                      <p className="text-sm text-muted-foreground">Avisar sobre propostas aprovadas e conciliações divergentes.</p>
                    </div>
                  </div>
                  <Switch checked={systemSettings.administrativeNotifications} onCheckedChange={(checked) => updateSetting("administrativeNotifications", checked)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Confirmar antes de excluir</Label><Switch checked={systemSettings.confirmBeforeDelete} onCheckedChange={(checked) => updateSetting("confirmBeforeDelete", checked)} /></div>
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Bloquear exclusão conciliada</Label><Switch checked={systemSettings.blockDeleteConciliatedEntries} onCheckedChange={(checked) => updateSetting("blockDeleteConciliatedEntries", checked)} /></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Retenção de logs em dias</Label><Input type="number" value={systemSettings.logRetentionDays} onChange={(e) => updateSetting("logRetentionDays", e.target.value)} /></div>
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Permitir exportar logs</Label><Switch checked={systemSettings.allowLogExport} onCheckedChange={(checked) => updateSetting("allowLogExport", checked)} /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-accent/20 bg-gradient-to-br from-accent/10 to-background">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5 text-accent" />
                  Notificações
                </CardTitle>
                <CardDescription>Eventos que devem gerar avisos administrativos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>E-mail padrão para alertas</Label>
                  <Input type="email" value={systemSettings.notificationEmail} onChange={(e) => updateSetting("notificationEmail", e.target.value)} placeholder="alertas@empresa.com" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Proposta enviada</Label><Switch checked={systemSettings.notifyProposalSent} onCheckedChange={(checked) => updateSetting("notifyProposalSent", checked)} /></div>
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Proposta aceita</Label><Switch checked={systemSettings.notifyProposalAccepted} onCheckedChange={(checked) => updateSetting("notifyProposalAccepted", checked)} /></div>
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Proposta rejeitada</Label><Switch checked={systemSettings.notifyProposalRejected} onCheckedChange={(checked) => updateSetting("notifyProposalRejected", checked)} /></div>
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Cobrança pendente</Label><Switch checked={systemSettings.notifyPendingCharge} onCheckedChange={(checked) => updateSetting("notifyPendingCharge", checked)} /></div>
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Serviço atrasado</Label><Switch checked={systemSettings.notifyDelayedService} onCheckedChange={(checked) => updateSetting("notifyDelayedService", checked)} /></div>
                  <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Divergência na conciliação</Label><Switch checked={systemSettings.notifyConciliationDivergence} onCheckedChange={(checked) => updateSetting("notifyConciliationDivergence", checked)} /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-muted bg-gradient-to-br from-secondary/50 to-background">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5 text-primary" />
                  Preferências Gerais
                </CardTitle>
                <CardDescription>Idioma, fuso, paginação e densidade da interface.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Idioma</Label><Select value={systemSettings.defaultLanguage} onValueChange={(value) => updateSetting("defaultLanguage", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pt-BR">Português</SelectItem><SelectItem value="en-US">Inglês</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Fuso horário</Label><Input value={systemSettings.timezone} onChange={(e) => updateSetting("timezone", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Formato de data</Label><Select value={systemSettings.dateFormat} onValueChange={(value) => updateSetting("dateFormat", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem><SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Registros por página</Label><Input type="number" value={systemSettings.recordsPerPage} onChange={(e) => updateSetting("recordsPerPage", e.target.value)} /></div>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Modo compacto da interface</Label><Switch checked={systemSettings.compactMode} onCheckedChange={(checked) => updateSetting("compactMode", checked)} /></div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-background to-primary/10">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Permissões por Módulo
                </CardTitle>
                <CardDescription>Resumo visual dos acessos principais por perfil.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Perfil</TableHead><TableHead>Comercial</TableHead><TableHead>Financeiro</TableHead><TableHead>Operação</TableHead><TableHead>BI</TableHead><TableHead>Usuários</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {[
                      ["Admin", "Sim", "Sim", "Sim", "Sim", "Sim"],
                      ["Gerencial", "Ver", "Ver", "Ver", "Sim", "Não"],
                      ["Comercial", "Sim", "Não", "Ver", "Parcial", "Não"],
                      ["Financeiro", "Ver", "Sim", "Não", "Parcial", "Não"],
                      ["Operação", "Ver", "Não", "Sim", "Parcial", "Não"],
                    ].map((row) => <TableRow key={row[0]}>{row.map((cell) => <TableCell key={cell}><Badge variant={cell === "Não" ? "secondary" : "default"}>{cell}</Badge></TableCell>)}</TableRow>)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-muted bg-gradient-to-br from-background to-secondary/40">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  Integrações Futuras
                </CardTitle>
                <CardDescription>Chaves de ativação para recursos integrados futuros.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>E-mail transacional</Label><Switch checked={systemSettings.transactionalEmailEnabled} onCheckedChange={(checked) => updateSetting("transactionalEmailEnabled", checked)} /></div>
                <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>WhatsApp</Label><Switch checked={systemSettings.whatsappEnabled} onCheckedChange={(checked) => updateSetting("whatsappEnabled", checked)} /></div>
                <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Importação bancária</Label><Switch checked={systemSettings.bankImportEnabled} onCheckedChange={(checked) => updateSetting("bankImportEnabled", checked)} /></div>
                <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>Webhooks</Label><Switch checked={systemSettings.webhooksEnabled} onCheckedChange={(checked) => updateSetting("webhooksEnabled", checked)} /></div>
                <div className="flex items-center justify-between rounded-md border bg-background/70 p-3"><Label>BI externo</Label><Switch checked={systemSettings.externalBiEnabled} onCheckedChange={(checked) => updateSetting("externalBiEnabled", checked)} /></div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button disabled={isLoadingSettings || saveSettings.isPending} onClick={() => saveSettings.mutate()}>
              <Save className="h-4 w-4 mr-2" />
              {saveSettings.isPending ? "Salvando..." : "Salvar Opções"}
            </Button>
          </div>
        </TabsContent>

        
        <TabsContent value="commercial-settings" className="space-y-4">
          <DevisSequenceManager />
        </TabsContent>

        <TabsContent value="units" className="space-y-4">
          <BusinessUnitsManager />
        </TabsContent>

        <TabsContent value="areas" className="space-y-4">
          <BusinessAreasManager />
        </TabsContent>

        <TabsContent value="backup" className="max-w-4xl mx-auto py-4">
          <BackupManager />
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <SystemDiagnostics />
        </TabsContent>

        <TabsContent value="updates" className="space-y-6">
          {(() => {
            const { data: versions = [], isLoading } = useQuery({
              queryKey: ["system-versions"],
              queryFn: async () => {
                const { data, error } = await supabase
                  .from("system_versions")
                  .select("*")
                  .order("created_at", { ascending: false });
                if (error) throw error;
                return data ?? [];
              },
            });

            if (isLoading) {
              return (
                <div className="flex items-center justify-center p-12 text-muted-foreground italic font-medium">
                  <Loader2 className="h-6 w-6 animate-spin mr-3 opacity-20" />
                  Carregando histórico de versões...
                </div>
              );
            }

            return (
              <div className="grid gap-6">
                {versions.map((release: any) => (
                  <Card key={release.id} className="overflow-hidden border-primary/10 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="bg-muted/30 pb-4 border-b border-muted/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-xl font-black">v{release.version}</CardTitle>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">
                              {release.release_name}
                            </Badge>
                            {release.is_current && (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold uppercase text-[9px]">
                                Atual
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider">
                            <Calendar className="h-3 w-3" />
                            {new Date(release.release_date).toLocaleDateString('pt-BR')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          Resumo da Atualização
                        </h4>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          {release.summary}
                        </p>
                      </div>

                      <div className="grid gap-8 md:grid-cols-3">
                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-emerald-700 flex items-center gap-2 uppercase tracking-wide">
                            <CheckCircle2 className="h-4 w-4" />
                            Implementações
                          </h4>
                          <ul className="space-y-2.5">
                            {release.implementations?.map((item: string, i: number) => (
                              <li key={i} className="text-sm text-slate-500 font-medium flex items-start gap-2.5">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/30" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-rose-700 flex items-center gap-2 uppercase tracking-wide">
                            <AlertCircle className="h-4 w-4" />
                            Correções
                          </h4>
                          <ul className="space-y-2.5">
                            {release.fixes?.map((item: string, i: number) => (
                              <li key={i} className="text-sm text-slate-500 font-medium flex items-start gap-2.5">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500/30" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-primary flex items-center gap-2 uppercase tracking-wide">
                            <Sparkles className="h-4 w-4" />
                            Visual & UX
                          </h4>
                          <ul className="space-y-2.5">
                            {release.visual_improvements?.map((item: string, i: number) => (
                              <li key={i} className="text-sm text-slate-500 font-medium flex items-start gap-2.5">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/30" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
});
