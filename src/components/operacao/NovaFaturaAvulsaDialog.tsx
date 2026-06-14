import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, FileText, Loader2, Paperclip, Plus, Trash2, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const BUCKET = "devis-pdfs";
const FOLDER = "fatura-avulsa";

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type CatalogItem = {
  service_price_id: string;
  name: string;
  unit_price: number;
  quantity: number;
};

type AreaAlloc = {
  area_slug: string;
  business_unit: string;
  label: string;
  percent: number;
};

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
  const [clientOpen, setClientOpen] = useState(false);
  const [clientCompany, setClientCompany] = useState("");
  const [businessUnits, setBusinessUnits] = useState<string[]>([]);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [areasOpen, setAreasOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [dueDate, setDueDate] = useState(todayStr());
  const [file, setFile] = useState<File | null>(null);
  const [areaAllocs, setAreaAllocs] = useState<AreaAlloc[]>([]);
  const [previewNumber, setPreviewNumber] = useState<string>("");

  const { data: clients = [] } = useQuery({
    queryKey: ["fa-clients"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients").select("id, name, company").eq("active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: unitsWithAreas = [] } = useQuery({
    queryKey: ["fa-units-with-areas"],
    enabled: open,
    queryFn: async () => {
      const [{ data: units, error: uErr }, { data: areas, error: aErr }] = await Promise.all([
        supabase.from("business_units").select("code, name").eq("active", true).order("code"),
        supabase.from("business_areas").select("business_unit").eq("is_active", true),
      ]);
      if (uErr) throw uErr;
      if (aErr) throw aErr;
      const valid = new Set((areas ?? []).map((a: any) => a.business_unit).filter(Boolean));
      return (units ?? []).filter((u: any) => valid.has(u.code));
    },
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["fa-areas-multi", businessUnits.join(",")],
    enabled: businessUnits.length > 0 && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_areas")
        .select("slug, label, business_unit")
        .in("business_unit", businessUnits)
        .eq("is_active", true)
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: prices = [] } = useQuery({
    queryKey: ["fa-service-prices-all", businessUnits.join(",")],
    enabled: open,
    queryFn: async () => {
      let q = supabase
        .from("service_prices")
        .select("id, name, price, description, business_unit, responsible_sector")
        .order("name");
      if (businessUnits.length > 0) q = q.in("business_unit", businessUnits);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedClient = useMemo(
    () => clients.find((c: any) => c.id === clientId),
    [clients, clientId]
  );

  // Sync clientCompany when client changes
  useEffect(() => {
    if (selectedClient && !clientCompany) {
      setClientCompany((selectedClient as any).company ?? "");
    }
  }, [selectedClient]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drop areas that no longer belong to selected units
  useEffect(() => {
    if (areas.length === 0 && businessUnits.length === 0) {
      setSelectedAreas([]);
      return;
    }
    const valid = new Set(areas.map((a: any) => a.slug));
    setSelectedAreas((prev) => prev.filter((s) => valid.has(s)));
  }, [businessUnits.join(","), areas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived total from catalog items
  const itemsTotal = useMemo(
    () => catalogItems.reduce((s, i) => s + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0),
    [catalogItems]
  );

  // Auto-fill amount from items unless user manually edited
  useEffect(() => {
    if (!amountTouched && catalogItems.length > 0) {
      setAmount(itemsTotal.toFixed(2));
    }
    if (!amountTouched && catalogItems.length > 0 && !title) {
      setTitle(catalogItems.map((i) => i.name).join(" + "));
    }
  }, [itemsTotal, catalogItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Maintain area allocations in sync with selected areas (equal split by default)
  useEffect(() => {
    const meta = new Map(areas.map((a: any) => [a.slug, a]));
    setAreaAllocs((prev) => {
      const keep = prev.filter((a) => selectedAreas.includes(a.area_slug));
      const missing = selectedAreas.filter((s) => !keep.find((k) => k.area_slug === s));
      const added = missing.map((slug) => {
        const m: any = meta.get(slug);
        return {
          area_slug: slug,
          business_unit: m?.business_unit ?? businessUnits[0] ?? "",
          label: m?.label ?? slug,
          percent: 0,
        };
      });
      const next = [...keep, ...added];
      if (next.length > 0) {
        // Default equal split when number of areas changed
        const eq = Number((100 / next.length).toFixed(2));
        const equalized = next.map((a, i) => ({
          ...a,
          percent: i === next.length - 1
            ? Number((100 - eq * (next.length - 1)).toFixed(2))
            : eq,
        }));
        // Preserve user-edited percents if they already sum to ~100
        const sumPrev = keep.reduce((s, a) => s + (a.percent || 0), 0);
        if (added.length === 0 && Math.abs(sumPrev - 100) < 0.5) return keep;
        return equalized;
      }
      return next;
    });
  }, [selectedAreas.join(","), areas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset / preview number
  useEffect(() => {
    if (open) {
      (async () => {
        const { data } = await (supabase as any).rpc("next_fa_number");
        if (data) setPreviewNumber(data as string);
      })();
    } else {
      setClientId(""); setClientCompany(""); setBusinessUnits([]); setSelectedAreas([]);
      setCatalogItems([]); setTitle(""); setDescription(""); setAmount("");
      setAmountTouched(false); setDueDate(todayStr()); setFile(null);
      setAreaAllocs([]); setPreviewNumber("");
    }
  }, [open]);

  const amountNum = Number(String(amount).replace(",", ".")) || 0;
  const percentSum = areaAllocs.reduce((s, a) => s + (Number(a.percent) || 0), 0);
  const allocValid = areaAllocs.length === 0 || Math.abs(percentSum - 100) < 0.5;

  const addCatalogItem = (p: any) => {
    setCatalogItems((prev) => {
      if (prev.find((i) => i.service_price_id === p.id)) return prev;
      return [...prev, {
        service_price_id: p.id,
        name: p.name,
        unit_price: Number(p.price) || 0,
        quantity: 1,
      }];
    });
  };
  const removeCatalogItem = (id: string) =>
    setCatalogItems((prev) => prev.filter((i) => i.service_price_id !== id));
  const updateCatalogItem = (id: string, patch: Partial<CatalogItem>) =>
    setCatalogItems((prev) => prev.map((i) => i.service_price_id === id ? { ...i, ...patch } : i));

  const equalizeAllocs = () => {
    if (areaAllocs.length === 0) return;
    const eq = Number((100 / areaAllocs.length).toFixed(2));
    setAreaAllocs((prev) => prev.map((a, i) => ({
      ...a,
      percent: i === prev.length - 1 ? Number((100 - eq * (prev.length - 1)).toFixed(2)) : eq,
    })));
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sessão expirada");
      if (!clientId) throw new Error("Selecione o cliente");
      if (!title.trim()) throw new Error("Informe a descrição do serviço");
      if (!amountNum || amountNum <= 0) throw new Error("Informe um valor válido");
      if (!dueDate) throw new Error("Informe o vencimento");
      if (selectedAreas.length === 0) throw new Error("Selecione ao menos uma área");
      if (!allocValid) throw new Error(`Rateio deve somar 100% (atual: ${percentSum.toFixed(2)}%)`);

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

      const primaryUnit = businessUnits[0] ?? null;
      const primaryArea = areaAllocs[0]?.area_slug ?? null;

      const allocsWithAmount = areaAllocs.map((a) => ({
        ...a,
        amount: Number(((amountNum * a.percent) / 100).toFixed(2)),
      }));

      const itemsPayload = catalogItems.map((i) => ({
        ...i,
        total: Number((i.unit_price * i.quantity).toFixed(2)),
      }));

      const { data: svc, error: svcErr } = await (supabase as any)
        .from("services")
        .insert({
          title: `[${fa_number}] ${title.trim()}`,
          description: description.trim() || null,
          business_unit: primaryUnit,
          additional_business_units: businessUnits.slice(1),
          responsible_sector: primaryArea,
          client_id: clientId,
          expected_end_date: dueDate,
          status: "a_iniciar",
          assigned_to: user.id,
          is_fa: true,
          origin: "fa",
          fa_number,
          fa_amount: amountNum,
          fa_due_date: dueDate,
          fa_attachment_url: attachment_url,
          fa_attachment_name: attachment_name,
          client_company_snapshot: clientCompany || null,
          service_price_id: catalogItems[0]?.service_price_id ?? null,
          fa_items: itemsPayload,
          fa_area_allocations: allocsWithAmount,
        })
        .select("id")
        .single();
      if (svcErr) throw svcErr;

      const clientName = (selectedClient as any)?.name ?? null;
      const { error: feErr } = await supabase.from("financial_entries").insert({
        entry_date: todayStr(),
        competence_month: todayStr().slice(0, 7),
        business_unit: primaryUnit,
        movement_description: `Fatura Avulsa ${fa_number} — ${title.trim()}`,
        counterparty_name: clientCompany || clientName,
        amount_in: amountNum,
        amount_out: 0,
        original_amount: amountNum,
        due_date: dueDate,
        entry_type: "receita",
        source_type: "manual",
        conciliation_status: "pendente",
        payment_status: "aberto",
        open_amount: amountNum,
        paid_amount: 0,
        document_reference: fa_number,
        client_id: clientId,
        area_slug: primaryArea,
        notes: `Origem: Fatura Avulsa (FA) — Aguardando envio${clientCompany ? `\nEmpresa: ${clientCompany}` : ""}`,
        user_id: user.id,
        fa_area_allocations: allocsWithAmount,
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
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Nova Fatura Avulsa (FA)
            {previewNumber && (
              <Badge variant="outline" className="ml-auto text-xs font-mono">{previewNumber}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Registre um serviço avulso. Selecione os itens da tabela de Precificação, defina as áreas
            envolvidas e o rateio do faturamento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 py-2">
          {/* Cliente */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Cliente *</Label>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button" variant="outline" role="combobox" aria-expanded={clientOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className={cn("truncate", !selectedClient && "text-muted-foreground")}>
                    {selectedClient
                      ? `${(selectedClient as any).name}${(selectedClient as any).company ? ` — ${(selectedClient as any).company}` : ""}`
                      : "Selecione o cliente..."}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command filter={(v, s) => v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0}>
                  <CommandInput placeholder="Buscar por nome ou empresa..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((c: any) => (
                        <CommandItem
                          key={c.id} value={`${c.name} ${c.company ?? ""}`}
                          onSelect={() => { setClientId(c.id); setClientOpen(false); }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", clientId === c.id ? "opacity-100" : "opacity-0")} />
                          <span className="truncate">
                            {c.name}{c.company ? <span className="text-muted-foreground"> — {c.company}</span> : null}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Empresa do cliente (opcional)</Label>
            <Input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)}
              placeholder="Razão social / empresa específica" />
          </div>

          {/* Unidades */}
          <div className="space-y-1.5">
            <Label>Unidades de negócio *</Label>
            <Popover open={unitsOpen} onOpenChange={setUnitsOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox"
                  className="w-full justify-between font-normal h-auto min-h-10 py-2">
                  <div className="flex flex-wrap gap-1 items-center">
                    {businessUnits.length === 0 ? (
                      <span className="text-muted-foreground">Selecione uma ou mais...</span>
                    ) : businessUnits.map((code) => {
                      const u = unitsWithAreas.find((x: any) => x.code === code);
                      return (
                        <Badge key={code} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
                          <span className="font-mono text-[10px]">{code}</span>
                          <span className="text-xs">{u?.name ?? ""}</span>
                          <span role="button" tabIndex={0}
                            onClick={(e) => { e.stopPropagation();
                              setBusinessUnits((p) => p.filter((c) => c !== code)); }}
                            className="ml-1 inline-flex items-center rounded hover:bg-muted-foreground/20 p-0.5">
                            <X className="h-3 w-3" />
                          </span>
                        </Badge>
                      );
                    })}
                  </div>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
                <div className="max-h-64 overflow-auto">
                  {unitsWithAreas.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma unidade com áreas ativas.</div>
                  ) : unitsWithAreas.map((u: any) => {
                    const checked = businessUnits.includes(u.code);
                    return (
                      <button type="button" key={u.code}
                        onClick={() => setBusinessUnits((p) =>
                          checked ? p.filter((c) => c !== u.code) : [...p, u.code])}
                        className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-accent text-left",
                          checked && "bg-accent/50")}>
                        <Check className={cn("h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                        <span className="font-mono text-[11px] text-muted-foreground">{u.code}</span>
                        <span>— {u.name}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Áreas multi */}
          <div className="space-y-1.5">
            <Label>Áreas / setores responsáveis *</Label>
            <Popover open={areasOpen} onOpenChange={setAreasOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox"
                  disabled={businessUnits.length === 0}
                  className="w-full justify-between font-normal h-auto min-h-10 py-2">
                  <div className="flex flex-wrap gap-1 items-center">
                    {selectedAreas.length === 0 ? (
                      <span className="text-muted-foreground">
                        {businessUnits.length > 0 ? "Selecione uma ou mais áreas..." : "Escolha a(s) unidade(s)"}
                      </span>
                    ) : selectedAreas.map((slug) => {
                      const a: any = areas.find((x: any) => x.slug === slug);
                      return (
                        <Badge key={slug} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
                          <span className="font-mono text-[10px]">{a?.business_unit}</span>
                          <span className="text-xs">{a?.label ?? slug}</span>
                          <span role="button" tabIndex={0}
                            onClick={(e) => { e.stopPropagation();
                              setSelectedAreas((p) => p.filter((s) => s !== slug)); }}
                            className="ml-1 inline-flex items-center rounded hover:bg-muted-foreground/20 p-0.5">
                            <X className="h-3 w-3" />
                          </span>
                        </Badge>
                      );
                    })}
                  </div>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
                <div className="max-h-64 overflow-auto">
                  {areas.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma área para estas unidades.</div>
                  ) : areas.map((a: any) => {
                    const checked = selectedAreas.includes(a.slug);
                    return (
                      <button type="button" key={`${a.business_unit}-${a.slug}`}
                        onClick={() => setSelectedAreas((p) =>
                          checked ? p.filter((s) => s !== a.slug) : [...p, a.slug])}
                        className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-accent text-left",
                          checked && "bg-accent/50")}>
                        <Check className={cn("h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                        <span className="font-mono text-[10px] text-muted-foreground">{a.business_unit}</span>
                        <span>— {a.label}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Catálogo de serviços (multi) */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Serviços do catálogo (Precificação)</Label>
            <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox"
                  className="w-full justify-between font-normal">
                  <span className="text-muted-foreground">
                    {catalogItems.length > 0
                      ? `${catalogItems.length} ite${catalogItems.length === 1 ? "m" : "ns"} selecionado${catalogItems.length === 1 ? "" : "s"} — adicione mais...`
                      : "Selecione um ou mais serviços..."}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command filter={(v, s) => v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0}>
                  <CommandInput placeholder="Buscar serviço..." />
                  <CommandList>
                    <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                    <CommandGroup>
                      {prices.map((p: any) => {
                        const checked = !!catalogItems.find((i) => i.service_price_id === p.id);
                        return (
                          <CommandItem key={p.id} value={`${p.name} ${p.business_unit ?? ""}`}
                            onSelect={() => {
                              if (checked) removeCatalogItem(p.id);
                              else addCatalogItem(p);
                            }}>
                            <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                            <div className="flex-1 min-w-0">
                              <div className="truncate text-sm">{p.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {p.business_unit ? `${p.business_unit} · ` : ""}{fmtBRL(Number(p.price) || 0)}
                              </div>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {catalogItems.length > 0 && (
              <div className="rounded-md border bg-muted/30 divide-y">
                {catalogItems.map((it) => (
                  <div key={it.service_price_id}
                    className="grid grid-cols-[1fr_70px_110px_32px] gap-2 items-center p-2">
                    <div className="text-sm truncate">{it.name}</div>
                    <Input type="number" min={1} step={1} value={it.quantity}
                      onChange={(e) => updateCatalogItem(it.service_price_id,
                        { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-8" />
                    <Input type="number" min={0} step="0.01" value={it.unit_price}
                      onChange={(e) => updateCatalogItem(it.service_price_id,
                        { unit_price: Number(e.target.value) || 0 })}
                      className="h-8 text-right" />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => removeCatalogItem(it.service_price_id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between items-center p-2 text-sm">
                  <span className="text-muted-foreground">Total do catálogo</span>
                  <span className="font-semibold">{fmtBRL(itemsTotal)}</span>
                </div>
              </div>
            )}
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
            <Label>Valor total (R$) *</Label>
            <Input type="number" step="0.01" inputMode="decimal" value={amount}
              onChange={(e) => { setAmount(e.target.value); setAmountTouched(true); }}
              placeholder="0,00" />
            {catalogItems.length > 0 && Math.abs(amountNum - itemsTotal) > 0.01 && (
              <p className="text-[11px] text-amber-600">
                Valor manual difere do total do catálogo ({fmtBRL(itemsTotal)}).
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Vencimento *</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {/* Rateio por área */}
          {areaAllocs.length > 0 && (
            <div className="sm:col-span-2 space-y-2">
              <Separator />
              <div className="flex items-center justify-between">
                <Label className="text-sm">Rateio do faturamento por área</Label>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={equalizeAllocs}>
                  Distribuir igualmente
                </Button>
              </div>
              <div className="rounded-md border divide-y">
                {areaAllocs.map((a, idx) => {
                  const value = (amountNum * (a.percent || 0)) / 100;
                  return (
                    <div key={a.area_slug}
                      className="grid grid-cols-[1fr_110px_140px] gap-2 items-center p-2">
                      <div className="text-sm min-w-0">
                        <div className="truncate">{a.label}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{a.business_unit}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input type="number" min={0} max={100} step="0.01" value={a.percent}
                          onChange={(e) => {
                            const v = Number(e.target.value) || 0;
                            setAreaAllocs((prev) => prev.map((x, i) =>
                              i === idx ? { ...x, percent: v } : x));
                          }}
                          className="h-8 text-right" />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <div className="text-right text-sm font-medium">{fmtBRL(value)}</div>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center p-2 text-sm bg-muted/30">
                  <span className={cn("font-medium", !allocValid && "text-destructive")}>
                    Soma: {percentSum.toFixed(2)}% {allocValid ? "✓" : "(deve ser 100%)"}
                  </span>
                  <span className="font-semibold">{fmtBRL(amountNum)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" /> Anexo (boleto, contrato, ordem de serviço)
            </Label>
            <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !allocValid}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Fatura Avulsa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
