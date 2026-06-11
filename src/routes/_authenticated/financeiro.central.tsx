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
import { Tabs, TabsContent, List, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft, Loader2, Banknote, CreditCard, Tag, Landmark, LayoutGrid, ToggleLeft, ToggleRight } from "lucide-react";
import { COMPANY_LIST, type CompanyCode } from "@/lib/companyCodes";
import { LoadingState } from "@/components/DataStates";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/financeiro/central")({
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
      if (acc.id) return await supabase.from("financial_accounts").update(acc).eq("id", acc.id);
      return await supabase.from("financial_accounts").insert(acc);
    },
    onSuccess: () => {
      toast.success("Conta salva!");
      queryClient.invalidateQueries({ queryKey: ["financial_accounts"] });
    }
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
              <AccountDialog onSave={(acc) => saveAccount.mutate(acc)} />
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
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">{acc.business_unit || "Todas"}</span>
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
                            <AccountDialog account={acc} onSave={(updated) => saveAccount.mutate(updated)} />
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

function AccountDialog({ account, onSave }: { account?: any, onSave: (acc: any) => void }) {
  const [form, setForm] = useState(account || { 
    name: "", 
    bank: "", 
    agency: "", 
    account_number: "", 
    pix_key: "", 
    pix_type: "cpf",
    holder_name: "",
    holder_document: "",
    business_unit: "",
    is_active: true,
    notes: ""
  });

  return (
    <Dialog>
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
            <Label>Unidade Vinculada</Label>
            <Select value={form.business_unit} onValueChange={v => setForm({ ...form, business_unit: v })}>
              <SelectTrigger><SelectValue placeholder="Todas as unidades" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as unidades</SelectItem>
                {COMPANY_LIST.map(c => <SelectItem key={c.code} value={c.code}>{c.short}</SelectItem>)}
              </SelectContent>
            </Select>
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
          <Button variant="outline" type="button" onClick={() => {}}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimpleSetupCard({ title, description, items, table, loading, showKind }: any) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState("receita");

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
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar {title}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              {showKind && (
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
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => add.mutate()} disabled={!newName || add.isPending}>Salvar</Button>
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
                {showKind && <TableHead>Tipo</TableHead>}
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it: any) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.name}</TableCell>
                  {showKind && <TableCell className="capitalize">{it.kind}</TableCell>}
                  <TableCell>
                    <Switch 
                      checked={table === "financial_categories" ? it.active : it.is_active} 
                      onCheckedChange={(c) => toggle.mutate({ id: it.id, status: c })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                      const { error } = await supabase.from(table).delete().eq("id", it.id);
                      if (error) toast.error("Não pode ser excluído por estar em uso.");
                      else { toast.success("Excluído!"); queryClient.invalidateQueries({ queryKey: [table] }); }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
