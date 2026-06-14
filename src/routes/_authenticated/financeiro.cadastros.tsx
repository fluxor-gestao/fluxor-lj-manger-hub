import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft, Loader2, Banknote, CreditCard, Tag, Landmark, LayoutGrid, ToggleLeft, ToggleRight } from "lucide-react";
import { COMPANY_LIST, type CompanyCode } from "@/lib/companyCodes";
import { LoadingState } from "@/components/DataStates";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/financeiro/cadastros")({
  component: FinancialSetup,
});

function FinancialSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["financial_accounts"],
    queryFn: async () => (await supabase.from("financial_accounts").select("*").order("name")).data || [],
  });

  const { data: methods = [], isLoading: loadingMethods } = useQuery({
    queryKey: ["financial_payment_methods"],
    queryFn: async () => (await supabase.from("financial_payment_methods").select("*").order("name")).data || [],
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["financial_categories"],
    queryFn: async () => (await supabase.from("financial_categories").select("*").order("name")).data || [],
  });

  const { data: costCenters = [], isLoading: loadingCenters } = useQuery({
    queryKey: ["financial_cost_centers"],
    queryFn: async () => (await supabase.from("financial_cost_centers").select("*").order("name")).data || [],
  });

  // Mutations
  const saveAccount = useMutation({
    mutationFn: async (acc: any) => {
      if (acc.id) {
        const { id, ...rest } = acc;
        return await supabase.from("financial_accounts").update(rest).eq("id", id);
      }
      return await supabase.from("financial_accounts").insert(acc);
    },
    onSuccess: (res) => {
      if ((res as any)?.error) {
        toast.error((res as any).error.message || "Erro ao salvar conta");
        return;
      }
      toast.success("Conta salva!");
      queryClient.invalidateQueries({ queryKey: ["financial_accounts"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar conta"),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      // Check for dependencies (simplified)
      return await supabase.from("financial_accounts").delete().eq("id", id);
    },
    onSuccess: (res) => {
      if (res.error) {
        toast.error("Não foi possível excluir esta conta. Verifique se ela possui lançamentos vinculados.");
      } else {
        toast.success("Conta excluída!");
        queryClient.invalidateQueries({ queryKey: ["financial_accounts"] });
      }
    }
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, table, status }: any) => {
      return await supabase.from(table).update({ is_active: status }).eq("id", id);
    },
    onSuccess: (_, variables) => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: [variables.table] });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display">Cadastro de Contas</h1>
          <p className="text-muted-foreground">Configurações e cadastros base do financeiro</p>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/financeiro" })}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="grid grid-cols-4 w-full md:w-[600px]">
          <TabsTrigger value="accounts" className="gap-2"><Landmark className="h-4 w-4" /> Contas LJ</TabsTrigger>
          <TabsTrigger value="methods" className="gap-2"><CreditCard className="h-4 w-4" /> Pagamentos</TabsTrigger>
          <TabsTrigger value="categories" className="gap-2"><Tag className="h-4 w-4" /> Categorias</TabsTrigger>
          <TabsTrigger value="centers" className="gap-2"><LayoutGrid className="h-4 w-4" /> Custos</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Contas de Pagamento / Bancárias</CardTitle>
                <CardDescription>Contas oficiais para recebimentos e pagamentos</CardDescription>
              </div>
              <AccountDialog onSave={(acc) => saveAccount.mutateAsync(acc)} />
            </CardHeader>
            <CardContent>
              {loadingAccounts ? <LoadingState /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome / Banco</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Chave PIX</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((acc: any) => (
                      <TableRow key={acc.id}>
                        <TableCell>
                          <div className="font-medium">{acc.name}</div>
                          <div className="text-xs text-muted-foreground">{acc.bank || "—"} · Ag: {acc.agency || "—"} / Cc: {acc.account_number || "—"}</div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const units: string[] = Array.isArray(acc.business_units) && acc.business_units.length > 0
                              ? acc.business_units
                              : (acc.business_unit ? [acc.business_unit] : []);
                            if (units.length === 0) {
                              return <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">Todas</span>;
                            }
                            return (
                              <div className="flex flex-wrap gap-1">
                                {units.map((u) => {
                                  const c = COMPANY_LIST.find((x) => x.code === u);
                                  return (
                                    <span key={u} className="text-xs px-2 py-0.5 rounded bg-muted">
                                      <span className="font-mono mr-1 text-muted-foreground">{u}</span>
                                      {c?.short ?? u}
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-xs">{acc.pix_key || "—"}</TableCell>
                        <TableCell>
                          <Switch 
                            checked={acc.is_active} 
                            onCheckedChange={(checked) => toggleStatus.mutate({ id: acc.id, table: "financial_accounts", status: checked })} 
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <AccountDialog account={acc} onSave={(updated) => saveAccount.mutateAsync(updated)} />
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteAccount.mutate(acc.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="mt-6">
           <SimpleSetupCard 
             title="Formas de Pagamento" 
             description="Métodos disponíveis para faturas e lançamentos"
             items={methods}
             table="financial_payment_methods"
             loading={loadingMethods}
           />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
           <SimpleSetupCard 
             title="Categorias Financeiras" 
             description="Classificação de plano de contas"
             items={categories}
             table="financial_categories"
             loading={loadingCategories}
             showKind
           />
        </TabsContent>

        <TabsContent value="centers" className="mt-6">
           <SimpleSetupCard 
             title="Centros de Custo" 
             description="Departamentos ou projetos para rateio"
             items={costCenters}
             table="financial_cost_centers"
             loading={loadingCenters}
           />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountDialog({ account, onSave }: { account?: any, onSave: (acc: any) => Promise<any> | any }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const buildInitial = () => {
    const base = account ? { ...account } : {
      name: "", bank: "", agency: "", account_number: "",
      pix_key: "", pix_type: "cpf",
      holder_name: "", holder_document: "",
      business_unit: "", business_units: [] as string[],
      is_active: true, notes: ""
    };
    if (!Array.isArray(base.business_units)) {
      base.business_units = base.business_unit ? [base.business_unit] : [];
    }
    return base;
  };
  const [form, setForm] = useState<any>(buildInitial);
  const [unitsOpen, setUnitsOpen] = useState(false);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) setForm(buildInitial());
  };

  const toggleUnit = (code: string) => {
    setForm((prev: any) => {
      const cur: string[] = Array.isArray(prev.business_units) ? prev.business_units : [];
      const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
      return { ...prev, business_units: next, business_unit: next[0] ?? "" };
    });
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.error("Informe o nome identificador da conta");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      // Normalize: keep both columns in sync; empty array means "Todas"
      const units: string[] = Array.isArray(payload.business_units) ? payload.business_units : [];
      payload.business_units = units;
      payload.business_unit = units[0] ?? null;
      await onSave(payload);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedUnits: string[] = Array.isArray(form.business_units) ? form.business_units : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {account ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="h-4 w-4 mr-2" /> Nova Conta</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{account ? "Editar Conta" : "Nova Conta LJ"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2 col-span-2">
            <Label>Nome Identificador da Conta *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Santander Principal LJ" />
          </div>
          <div className="space-y-2">
            <Label>Banco</Label>
            <Input value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Unidades Vinculadas</Label>
            <Dialog open={unitsOpen} onOpenChange={setUnitsOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline"
                  className="w-full justify-between font-normal h-auto min-h-10 py-2">
                  <div className="flex flex-wrap gap-1 items-center text-left">
                    {selectedUnits.length === 0 ? (
                      <span className="text-muted-foreground text-sm">Todas as unidades</span>
                    ) : selectedUnits.map((code) => {
                      const c = COMPANY_LIST.find((x) => x.code === code);
                      return (
                        <span key={code} className="text-xs px-2 py-0.5 rounded bg-muted">
                          <span className="font-mono mr-1 text-muted-foreground">{code}</span>
                          {c?.name ?? code}
                        </span>
                      );
                    })}
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Selecionar unidades</DialogTitle>
                </DialogHeader>
                <div className="space-y-1 py-2 max-h-80 overflow-auto">
                  {COMPANY_LIST.map((c) => {
                    const checked = selectedUnits.includes(c.code);
                    return (
                      <button type="button" key={c.code}
                        onClick={() => toggleUnit(c.code)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent text-left ${checked ? "bg-accent/60" : ""}`}>
                        <span className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${checked ? "bg-primary border-primary text-primary-foreground" : "border-input"}`}>
                          {checked ? "✓" : ""}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">{c.code}</span>
                        <span className="flex-1">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setForm({ ...form, business_units: [], business_unit: "" })}>
                    Limpar (todas)
                  </Button>
                  <Button onClick={() => setUnitsOpen(false)}>Concluir</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <p className="text-[11px] text-muted-foreground">
              Vazio = disponível para todas as unidades.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Agência</Label>
            <Input value={form.agency} onChange={e => setForm({ ...form, agency: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Conta</Label>
            <Input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Titular</Label>
            <Input value={form.holder_name} onChange={e => setForm({ ...form, holder_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>CPF/CNPJ Titular</Label>
            <Input value={form.holder_document} onChange={e => setForm({ ...form, holder_document: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tipo Chave PIX</Label>
            <Select value={form.pix_type} onValueChange={v => setForm({ ...form, pix_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Chave Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Chave PIX</Label>
            <Input value={form.pix_key} onChange={e => setForm({ ...form, pix_key: e.target.value })} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function SimpleSetupCard({ title, description, items, table, loading, showKind }: any) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState("despesa");
  const [newDreGroup, setNewDreGroup] = useState("");

  const DRE_GROUPS = [
    "Despesas com Impostos",
    "Encargos Sociais",
    "Despesas com Pessoal",
    "Despesas Administrativas",
    "Despesas Financeiras",
    "Investimentos no Patrimônio",
    "Ressarcimentos",
    "Diretoria",
    "Receita Operacional",
    "Outras Receitas"
  ];

  const addOrUpdate = useMutation({
    mutationFn: async () => {
      const payload: any = { 
        name: newName,
        kind: newKind,
        dre_group: newDreGroup || null
      };
      
      if (editingItem) {
        return await supabase.from(table).update(payload).eq("id", editingItem.id);
      }
      return await supabase.from(table).insert(payload);
    },
    onSuccess: () => {
      toast.success(editingItem ? "Atualizado com sucesso!" : "Cadastrado com sucesso!");
      resetForm();
      setIsAddOpen(false);
      queryClient.invalidateQueries({ queryKey: [table] });
    }
  });

  const resetForm = () => {
    setNewName("");
    setNewKind("despesa");
    setNewDreGroup("");
    setEditingItem(null);
  };

  const handleEdit = (it: any) => {
    setEditingItem(it);
    setNewName(it.name);
    setNewKind(it.kind || "despesa");
    setNewDreGroup(it.dre_group || "");
    setIsAddOpen(true);
  };

  const add = useMutation({
    mutationFn: async () => {
      const payload: any = { name: newName };
      if (showKind) payload.kind = newKind;
      return await supabase.from(table).insert(payload);
    },
    onSuccess: () => {
      toast.success("Cadastrado com sucesso!");
      setNewName("");
      setIsAddOpen(false);
      queryClient.invalidateQueries({ queryKey: [table] });
    }
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const field = table === "financial_categories" ? "active" : "is_active";
      return await supabase.from(table).update({ [field]: status }).eq("id", id);
    },
    onSuccess: () => {
      toast.success("Status alterado!");
      queryClient.invalidateQueries({ queryKey: [table] });
    }
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingItem ? "Editar" : "Adicionar"} {title}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              {showKind && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={newKind} onValueChange={setNewKind}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                        <SelectItem value="ambos">Ambos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Grupo DRE</Label>
                    <Select value={newDreGroup} onValueChange={setNewDreGroup}>
                      <SelectTrigger><SelectValue placeholder="Selecione um grupo" /></SelectTrigger>
                      <SelectContent>
                        {DRE_GROUPS.map(group => (
                          <SelectItem key={group} value={group}>{group}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => addOrUpdate.mutate()} disabled={!newName || addOrUpdate.isPending}>
                {addOrUpdate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <LoadingState /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                {showKind && <TableHead>Tipo / Grupo DRE</TableHead>}
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it: any) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.name}</TableCell>
                  {showKind && (
                    <TableCell>
                      <div className="capitalize font-medium">{it.kind}</div>
                      {it.dre_group && <div className="text-[10px] text-muted-foreground uppercase font-bold">{it.dre_group}</div>}
                    </TableCell>
                  )}
                  <TableCell>
                    <Switch 
                      checked={table === "financial_categories" ? it.active : it.is_active} 
                      onCheckedChange={(c) => toggle.mutate({ id: it.id, status: c })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(it)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                        const { error } = await supabase.from(table).delete().eq("id", it.id);
                        if (error) toast.error("Não pode ser excluído por estar em uso.");
                        else { toast.success("Excluído!"); queryClient.invalidateQueries({ queryKey: [table] }); }
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
