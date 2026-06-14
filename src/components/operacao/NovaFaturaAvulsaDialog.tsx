import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const BUCKET = "devis-pdfs";
const FOLDER = "fatura-avulsa";

const todayStr = () => new Date().toISOString().slice(0, 10);

async function uploadFA(file: File, userId: string) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${FOLDER}/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
  return { url: data?.signedUrl ?? path, name: file.name };
}

export function NovaFaturaAvulsaDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [clientId, setClientId] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [businessUnits, setBusinessUnits] = useState<string[]>([]);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [responsibleSector, setResponsibleSector] = useState("");
  const [servicePriceId, setServicePriceId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayStr());
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewNumber, setPreviewNumber] = useState<string>("");

  const primaryUnit = businessUnits[0] ?? "";

  const { data: clients = [] } = useQuery({
    queryKey: ["fa-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, company")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["catalog", "business_units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_units")
        .select("code, name")
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["business-areas", businessUnit],
    enabled: !!businessUnit && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_areas")
        .select("slug, label")
        .eq("business_unit", businessUnit)
        .eq("is_active", true)
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: prices = [] } = useQuery({
    queryKey: ["fa-service-prices", businessUnit, responsibleSector],
    enabled: open,
    queryFn: async () => {
      let q = supabase.from("service_prices").select("id, name, price, description, business_unit, responsible_sector").order("name");
      if (businessUnit) q = q.eq("business_unit", businessUnit);
      if (responsibleSector) q = q.eq("responsible_sector", responsibleSector);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedClient = useMemo(
    () => clients.find((c: any) => c.id === clientId),
    [clients, clientId]
  );

  useEffect(() => {
    if (selectedClient && !clientCompany) {
      setClientCompany((selectedClient as any).company ?? "");
    }
  }, [selectedClient]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!servicePriceId) return;
    const sp = prices.find((p: any) => p.id === servicePriceId);
    if (sp) {
      if (!title) setTitle(sp.name);
      if (!description && sp.description) setDescription(sp.description);
      if (!amount && sp.price) setAmount(String(sp.price));
    }
  }, [servicePriceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) {
      (async () => {
        const { data } = await (supabase as any).rpc("next_fa_number");
        if (data) setPreviewNumber(data as string);
      })();
    } else {
      setClientId(""); setClientCompany(""); setBusinessUnit(""); setResponsibleSector("");
      setServicePriceId(""); setTitle(""); setDescription(""); setAmount("");
      setDueDate(todayStr()); setFile(null); setPreviewNumber("");
    }
  }, [open]);

  const create = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sessão expirada");
      if (!clientId) throw new Error("Selecione o cliente");
      if (!title.trim()) throw new Error("Informe a descrição do serviço");
      const amt = Number(String(amount).replace(",", "."));
      if (!amt || amt <= 0) throw new Error("Informe um valor válido");
      if (!dueDate) throw new Error("Informe o vencimento");

      // Get FA number authoritatively at submit time
      const { data: faNum, error: faErr } = await (supabase as any).rpc("next_fa_number");
      if (faErr) throw faErr;
      const fa_number = faNum as string;

      let attachment_url: string | null = null;
      let attachment_name: string | null = null;
      if (file) {
        const up = await uploadFA(file, user.id);
        attachment_url = up.url;
        attachment_name = up.name;
      }

      // 1) Create service row (operation) tagged as FA
      const { data: svc, error: svcErr } = await (supabase as any)
        .from("services")
        .insert({
          title: `[${fa_number}] ${title.trim()}`,
          description: description.trim() || null,
          business_unit: businessUnit || null,
          responsible_sector: responsibleSector || null,
          client_id: clientId,
          expected_end_date: dueDate,
          status: "a_iniciar",
          assigned_to: user.id,
          is_fa: true,
          origin: "fa",
          fa_number,
          fa_amount: amt,
          fa_due_date: dueDate,
          fa_attachment_url: attachment_url,
          fa_attachment_name: attachment_name,
          client_company_snapshot: clientCompany || null,
          service_price_id: servicePriceId || null,
        })
        .select("id")
        .single();
      if (svcErr) throw svcErr;

      // 2) Create receivable in financial_entries (Contas a Receber)
      const clientName = (selectedClient as any)?.name ?? null;
      const { error: feErr } = await supabase.from("financial_entries").insert({
        entry_date: todayStr(),
        competence_month: todayStr().slice(0, 7),
        business_unit: businessUnit || null,
        movement_description: `Fatura Avulsa ${fa_number} — ${title.trim()}`,
        counterparty_name: clientCompany || clientName,
        amount_in: amt,
        amount_out: 0,
        original_amount: amt,
        due_date: dueDate,
        entry_type: "receita",
        source_type: "manual",
        conciliation_status: "pendente",
        payment_status: "aberto",
        open_amount: amt,
        paid_amount: 0,
        document_reference: fa_number,
        client_id: clientId,
        area_slug: responsibleSector || null,
        notes: `Origem: Fatura Avulsa (FA) — Aguardando envio${clientCompany ? `\nEmpresa: ${clientCompany}` : ""}`,
        user_id: user.id,
      } as any);
      if (feErr) throw feErr;

      return { fa_number };
    },
    onSuccess: ({ fa_number }) => {
      toast.success(`Fatura Avulsa ${fa_number} criada — cobrança enviada para Contas a Receber`);
      qc.invalidateQueries({ queryKey: ["operacao-services"] });
      qc.invalidateQueries({ queryKey: ["financial_entries"] });
      qc.invalidateQueries({ queryKey: ["payment_planner"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar Fatura Avulsa"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Nova Fatura Avulsa (FA)
            {previewNumber && (
              <Badge variant="outline" className="ml-auto text-xs font-mono">{previewNumber}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Registre um serviço avulso que não passou por Devis. Será gerada cobrança em Contas a Receber
            com status <strong>Aguardando envio</strong> e origem <strong>FA</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 py-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
              <SelectContent className="max-h-72">
                {clients.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.company ? ` — ${c.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Empresa do cliente (opcional)</Label>
            <Input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)}
              placeholder="Razão social / empresa específica" />
          </div>

          <div className="space-y-1.5">
            <Label>Unidade de negócio</Label>
            <Select value={businessUnit} onValueChange={(v) => { setBusinessUnit(v); setResponsibleSector(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {units.map((u: any) => (
                  <SelectItem key={u.code} value={u.code}>{u.code} — {u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Área / setor responsável</Label>
            <Select value={responsibleSector} onValueChange={setResponsibleSector} disabled={!businessUnit}>
              <SelectTrigger><SelectValue placeholder={businessUnit ? "Selecione..." : "Escolha a unidade"} /></SelectTrigger>
              <SelectContent>
                {areas.map((a: any) => (
                  <SelectItem key={a.slug} value={a.slug}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Serviço do catálogo (opcional)</Label>
            <Select value={servicePriceId} onValueChange={setServicePriceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione para preencher título e valor automaticamente..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {prices.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum serviço cadastrado para os filtros atuais.</div>
                ) : prices.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — R$ {Number(p.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Descrição do serviço *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Consultoria pontual de tributário" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Detalhes (opcional)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais que constarão no serviço e na cobrança." />
          </div>

          <div className="space-y-1.5">
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" inputMode="decimal"
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label>Vencimento *</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" /> Anexo (boleto, contrato, ordem de serviço)
            </Label>
            <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || create.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Fatura Avulsa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
