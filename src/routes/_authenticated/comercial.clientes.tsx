import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft, HelpCircle, Search, Upload, MapPin } from "lucide-react";
import ClientLocationEnrichment from "@/components/clients/ClientLocationEnrichment";
import BulkClientLocationEnrichment from "@/components/clients/BulkClientLocationEnrichment";
import { LoadingState, EmptyState, ErrorState } from "@/components/DataStates";
import { Pagination } from "@/components/Pagination";
import { rangeFor } from "@/lib/pagination";
import { ActiveCompanyBanner } from "@/components/ActiveCompanyBanner";

const CLIENTS_PAGE_SIZE = 50;

type ClientForm = {
  id?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  document: string;
  type: "PF" | "PJ";
  notes: string;
};

const emptyClient: ClientForm = { name: "", company: "", email: "", phone: "", document: "", type: "PJ", notes: "" };

function Clientes() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient);
  const [clientsPage, setClientsPage] = useState(0);
  const [clientsSearch, setClientsSearch] = useState("");
  const [enrichmentOpen, setEnrichmentOpen] = useState(false);
  const [bulkEnrichmentOpen, setBulkEnrichmentOpen] = useState(false);
  const [selectedClientToEnrich, setSelectedClientToEnrich] = useState<any>(null);

  useEffect(() => { setClientsPage(0); }, [clientsSearch]);

  const clientsListQuery = useQuery({
    queryKey: ["clients", "list", { page: clientsPage, q: clientsSearch }],
    queryFn: async () => {
      const [from, to] = rangeFor(clientsPage, CLIENTS_PAGE_SIZE);
      let q = supabase
        .from("clients")
        .select("id, name, company, email, phone, document, type, business_unit_id, active, location_status", { count: "exact" })
        .order("name")
        .range(from, to);

      const term = clientsSearch.trim();
      if (term) q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%,document.ilike.%${term}%`);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });

  const saveClient = useMutation({
    mutationFn: async (form: ClientForm) => {
      const payload = {
        name: form.name,
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        document: form.document || null,
        type: form.type,
        notes: form.notes || null,
      };
      if (form.id) {
        const { error } = await supabase.from("clients").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Cliente salvo!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setClientDialogOpen(false);
      setClientForm(emptyClient);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { count, error: countErr } = await supabase
        .from("devis")
        .select("id", { count: "exact", head: true })
        .eq("client_id", id);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        throw new Error(`Cliente possui ${count} devis vinculado(s). Exclua/realoque antes.`);
      }
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente excluído.");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEditClient = (c: any) => {
    setClientForm({
      id: c.id,
      name: c.name ?? "",
      company: c.company ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      document: c.document ?? "",
      type: (c.type as "PF" | "PJ") ?? "PJ",
      notes: c.notes ?? "",
    });
    setClientDialogOpen(true);
  };

  const openEnrichment = (c: any) => {
    setSelectedClientToEnrich(c);
    setEnrichmentOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gestão da base de clientes</p>
          <ActiveCompanyBanner className="mt-2" />
        </div>
        <div className="flex gap-2 sm:self-start">
          <Button variant="ghost" size="icon" asChild title="Central de Ajuda — Comercial">
            <Link to="/ajuda/comercial"><HelpCircle className="h-5 w-5" /></Link>
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/comercial" })}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou documento"
            value={clientsSearch}
            onChange={(e) => setClientsSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx, .xls';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              
              const promise = new Promise(async (resolve, reject) => {
                try {
                  const reader = new FileReader();
                  reader.onload = async (evt) => {
                    try {
                      const bstr = evt.target?.result;
                      const { read, utils } = await import('xlsx');
                      const wb = read(bstr, { type: 'binary' });
                      const wsname = wb.SheetNames[0];
                      const ws = wb.Sheets[wsname];
                      const data = utils.sheet_to_json(ws);
                      
                      let successCount = 0;
                      for (const row of data as any[]) {
                        const empresa = row['EMPRESA'] || row['Empresa'];
                        const nomeQsa = row['CLIENTE - QSA'] || row['Nome'];
                        if (!empresa) continue;
                        
                        const emailField = String(row['e-mail de contato'] || row['Email'] || '').trim();
                        const emails = emailField.split(/[,;\s/]+/).filter(e => e.includes('@'));
                        const primaryEmail = emails[0] || null;
                        const allEmails = emails.join(', ');

                        const { error } = await supabase.from('clients').insert({
                          name: String(nomeQsa || empresa).trim(),
                          company: String(empresa).trim(),
                          document: String(row['CNPJ'] || '').trim() || null,
                          email: primaryEmail,
                          type: 'PJ',
                          notes: `E-mails: ${allEmails}\nSócio/QSA: ${nomeQsa || ''}\nIdioma: ${row['Idioma'] || ''}`,
                          active: true
                        });
                        if (!error) successCount++;
                      }
                      resolve(successCount);
                    } catch (err) {
                      reject(err);
                    }
                  };
                  reader.readAsBinaryString(file);
                } catch (err) {
                  reject(err);
                }
              });

              toast.promise(promise, {
                loading: 'Processando planilha...',
                success: (count) => {
                  queryClient.invalidateQueries({ queryKey: ["clients"] });
                  return `${count} clientes importados com sucesso!`;
                },
                error: 'Erro ao importar clientes.'
              });
            };
            input.click();
          }}>
            <Upload className="h-4 w-4 mr-2" /> Upload de base
          </Button>

          <Button variant="outline" onClick={() => setBulkEnrichmentOpen(true)}>
            <MapPin className="h-4 w-4 mr-2" /> Atualizar localizações pendentes
          </Button>

          <Dialog open={clientDialogOpen} onOpenChange={(o) => { setClientDialogOpen(o); if (!o) setClientForm(emptyClient); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{clientForm.id ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome (QSA) *</Label>
                  <Input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
                </div>
                <div>
                  <Label>Empresa</Label>
                  <Input value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo *</Label>
                  <Select value={clientForm.type} onValueChange={(v: "PF" | "PJ") => setClientForm({ ...clientForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PF">Pessoa Física</SelectItem>
                      <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email</Label>
                    <Input value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Documento (CPF/CNPJ)</Label>
                  <Input value={clientForm.document} onChange={(e) => setClientForm({ ...clientForm, document: e.target.value })} />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea rows={3} value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => saveClient.mutate(clientForm)} disabled={!clientForm.name || saveClient.isPending}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientsListQuery.isLoading && !clientsListQuery.data ? (
              <TableRow><TableCell colSpan={7}><LoadingState /></TableCell></TableRow>
            ) : clientsListQuery.isError ? (
              <TableRow><TableCell colSpan={7}><ErrorState onRetry={() => clientsListQuery.refetch()} /></TableCell></TableRow>
            ) : (clientsListQuery.data?.rows.length ?? 0) === 0 ? (
              <TableRow><TableCell colSpan={7}><EmptyState title="Nenhum cliente encontrado" description={clientsSearch ? "Ajuste a busca." : "Cadastre o primeiro cliente."} /></TableCell></TableRow>
            ) : (clientsListQuery.data?.rows ?? []).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.company || "—"}</TableCell>
                <TableCell><Badge variant="outline">{c.type || "PJ"}</Badge></TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>{c.document}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => openEnrichment(c)}
                      title="Enriquecer localização"
                      className={c.location_status === 'localizada' ? 'text-primary' : 'text-muted-foreground'}
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEditClient(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" disabled={deleteClient.isPending}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação é permanente. O cliente <strong>{c.name}</strong> será removido. Clientes com devis vinculados não podem ser excluídos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteClient.mutate(c.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-4">
          <Pagination
            page={clientsPage}
            pageSize={CLIENTS_PAGE_SIZE}
            total={clientsListQuery.data?.total ?? 0}
            onPageChange={setClientsPage}
            disabled={clientsListQuery.isFetching}
          />
        </div>
      </Card>

      <ClientLocationEnrichment 
        open={enrichmentOpen}
        onOpenChange={setEnrichmentOpen}
        clientId={selectedClientToEnrich?.id}
        clientName={selectedClientToEnrich?.name}
        clientCompany={selectedClientToEnrich?.company}
        clientDocument={selectedClientToEnrich?.document}
        onEnriched={() => {
          clientsListQuery.refetch();
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        }}
      />

      <BulkClientLocationEnrichment 
        open={bulkEnrichmentOpen}
        onOpenChange={setBulkEnrichmentOpen}
        onComplete={() => {
          clientsListQuery.refetch();
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        }}
      />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/comercial/clientes")({
  component: Clientes,
});
