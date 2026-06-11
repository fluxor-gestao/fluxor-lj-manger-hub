import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Save, X, CalendarIcon, Sparkles, Loader2, Link as LinkIcon, CheckCircle2, FileDown, Languages, AlertTriangle, Plus, FileText, Info, DollarSign, Paperclip } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { STATUS_LABELS as statusLabels, STATUS_BADGE_CLASSES as devisStatusColors, requiresValidation } from "@/lib/devisStatus";
import AISuggestionsBlock, { type AISuggestions } from "@/components/devis/AISuggestionsBlock";
import ValidationChecklist from "@/components/devis/ValidationChecklist";
import { CurrencyInputBRL } from "@/components/ui/currency-input-brl";
import DevisPdfTemplate from "@/components/devis/DevisPdfTemplate";
import SendDevisDialog from "@/components/devis/SendDevisDialog";
import { exportDevisPdfFromContainer } from "@/lib/exportDevisPdf";
import { ensureDevisBilingual } from "@/lib/ensureDevisBilingual";
import { DevisPricingManager } from "@/components/devis/DevisPricingManager";
import { getMissingClauses, isProposalComplete } from "@/lib/validateProposal";
import { createRoot } from "react-dom/client";
import { Send } from "lucide-react";
import { CompanyBadge } from "@/components/CompanyBadge";
import { COMPANY_LIST, isCompanyCode, type CompanyCode } from "@/lib/companyCodes";
import { AreaBadge } from "@/components/AreaBadge";
import { getAreasFor, isValidAreaForCompany } from "@/lib/businessAreas";
import { MultiAreaSelector } from "@/components/devis/MultiAreaSelector";
import { formatDevisCode } from "@/lib/formatDevis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityAttachments } from "@/components/EntityAttachments";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

function DevisDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [viewLang, setViewLang] = useState<"native" | "pt">("native");
  const [translating, setTranslating] = useState(false);
  const [translatedFields, setTranslatedFields] = useState<Record<string, string> | null>(null);

  const { data: devis, isLoading } = useQuery({
    queryKey: ["devis", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("devis").select("*, devis_service_areas(area_slug)").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await supabase.from("clients").select("*").order("name")).data ?? [],
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => (await supabase.from("profiles").select("user_id, full_name, email").order("full_name")).data ?? [],
  });

  const { data: linkedService } = useQuery({
    queryKey: ["devis-service", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, responsible_sector, status")
        .eq("devis_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const clientsById = useMemo(() => Object.fromEntries(clients.map((c: any) => [c.id, c])), [clients]);
  const profilesById = useMemo(() => Object.fromEntries(profiles.map((p: any) => [p.user_id, p])), [profiles]);

  useEffect(() => {
    if (!devis) return;
    if (editing) return;
    const areas = (devis.devis_service_areas || []).map((a: any) => a.area_slug);
    setSelectedAreas(areas);
    const total = devis.total_amount ?? 0;
    const down = devis.down_payment_amount ?? 0;
    const pct = total > 0 ? Math.round((down / total) * 100) : 50;
    setForm({
      ...devis,
      meeting_date: devis.meeting_date ? parseISO(devis.meeting_date) : undefined,
      deadline_date: devis.deadline_date ? parseISO(devis.deadline_date) : undefined,
      total_amount: String(total || ""),
      down_payment_amount: String(down || ""),
      down_payment_percentage: String(pct),
    });
  }, [devis, editing]);

  // Garante tradução para o idioma do cliente (campos *_secondary)
  // assim que o devis é carregado, quando source_language != pt.
  useEffect(() => {
    if (!devis?.id) return;
    const src = (devis as any).source_language || "pt";
    if (src === "pt") return;
    const hasSec =
      typeof (devis as any).proposal_structure_secondary === "string" &&
      (devis as any).proposal_structure_secondary.trim().length > 0;
    const hasContent =
      ((devis as any).proposal_structure || "").trim().length > 0 ||
      ((devis as any).scope_description || "").trim().length > 0;
    if (hasSec || !hasContent) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureDevisBilingual(devis);
        if (!cancelled) queryClient.invalidateQueries({ queryKey: ["devis", devis.id] });
      } catch (e) {
        console.warn("auto ensureDevisBilingual falhou:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [devis?.id, (devis as any)?.source_language, (devis as any)?.proposal_structure_secondary, queryClient]);

  const createService = useMutation({
    mutationFn: async () => {
      if (!devis) return;
      const { error } = await supabase.from("services").insert({
        title: devis.title,
        description: devis.scope_description,
        business_unit: devis.business_unit,
        responsible_sector: devis.responsible_sector,
        client_id: devis.client_id,
        devis_id: devis.id,
        status: "a_iniciar",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Processo criado na operação!");
      queryClient.invalidateQueries({ queryKey: ["devis-service", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      // Bloqueio: status que exige validação não pode ser salvo se ainda não validado
      if (requiresValidation(form.status) && !devis?.validated_at) {
        throw new Error("Valide a proposta antes de mover para este status.");
      }
      if (!form.deadline_date) {
        throw new Error("O prazo (deadline) é obrigatório.");
      }
      if (!isCompanyCode(form.business_unit)) {

        throw new Error("Selecione a empresa responsável.");
      }
      if (selectedAreas.length === 0) {
        throw new Error("Selecione pelo menos uma área responsável.");
      }
      const payload = {
        client_id: form.client_id || null,
        meeting_date: form.meeting_date ? format(form.meeting_date, "yyyy-MM-dd") : null,
        deadline_date: form.deadline_date ? format(form.deadline_date, "yyyy-MM-dd") : null,
        commercial_responsible: form.commercial_responsible || null,
        meeting_summary: form.meeting_summary || null,
        meeting_report: form.meeting_report || null,
        status: form.status,
        total_amount: Number(form.total_amount) || 0,
        down_payment_amount: Number(form.down_payment_amount) || 0,
        notes: form.notes || null,
        title: form.title,
        service_type: form.service_type || null,
        responsible_sector: selectedAreas[0] || null,
        scope_description: form.scope_description || null,
        proposal_structure: form.proposal_structure || null,
        business_unit: form.business_unit,
        validation_client_confirmed: !!form.validation_client_confirmed,
        validation_service_confirmed: !!form.validation_service_confirmed,
        validation_sector_defined: !!form.validation_sector_defined,
        validation_amount_confirmed: !!form.validation_amount_confirmed,
        validation_deadline_defined: !!form.validation_deadline_defined,
      };
      const { error } = await supabase.from("devis").update(payload).eq("id", id!);
      if (error) throw error;

      // Atualizar as áreas na tabela de relacionamento
      const { error: deleteError } = await supabase.from("devis_service_areas").delete().eq("devis_id", id!);
      if (deleteError) throw deleteError;

      if (selectedAreas.length > 0) {
        const areaPayload = selectedAreas.map(slug => ({
          devis_id: id!,
          area_slug: slug
        }));
        const { error: areaError } = await supabase.from("devis_service_areas").insert(areaPayload);
        if (areaError) throw areaError;
      }
    },
    onSuccess: () => {
      toast.success("Devis atualizado!");
      queryClient.invalidateQueries({ queryKey: ["devis"] });
      queryClient.invalidateQueries({ queryKey: ["devis", id] });
      setEditing(false);
      setAiSuggestions(null);
    },
    onError: (e: any) => toast.error(e.message),
  });


  const handleGenerate = async (tier: "draft" | "final" = "draft") => {
    if (!form.meeting_report?.trim()) return;
    setGenerating(true);
    try {
      const client = clientsById[form.client_id];
      const { data, error } = await supabase.functions.invoke("generate-devis-proposal", {
        body: {
          meeting_report: form.meeting_report,
          client_name: client?.name,
          client_document: client?.document,
          client_address: [client?.address, client?.city].filter(Boolean).join(", ") || undefined,
          total_amount: Number(form.total_amount) || undefined,
          deadline_date: form.deadline_date ? format(form.deadline_date, "yyyy-MM-dd") : undefined,
          business_unit: form.business_unit,
          tier,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const p = data.proposal ?? data.suggestions;
      if (!p) throw new Error("Resposta da IA sem dados");
      setAiSuggestions({
        service_type: p.service_type ?? "",
        responsible_sector: p.responsible_sector ?? "",
        scope_description: p.scope_description ?? "",
        proposal_structure: p.proposal_structure ?? "",
        suggested_pricing_items: p.suggested_pricing_items || [],
      });
      if (p.total_amount && !form.total_amount) {
        const total = String(p.total_amount);
        const down = String((Number(p.total_amount) * 0.5).toFixed(2));
        setForm((f: any) => ({ ...f, total_amount: total, down_payment_amount: down, down_payment_percentage: "50" }));
      }
      if (p.title && !form.title) setForm((f: any) => ({ ...f, title: p.title }));
      toast.success(tier === "final" ? "Proposta refinada!" : "Proposta gerada.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar proposta");
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptPricingItems = async (items: any[]) => {
    if (!id || !items.length) return;
    try {
      // Buscar todos os service_prices para vincular corretamente se possível
      const { data: servicePrices } = await supabase.from("service_prices").select("id, name");
      
      const payload = items.map(item => {
        const matchingPrice = servicePrices?.find(s => s.name.toLowerCase() === item.service_name.toLowerCase());
        return {
          devis_id: id,
          service_price_id: matchingPrice?.id || null,
          name: item.service_name,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity,
          quantity: item.quantity,
        };
      });

      const { error } = await supabase.from("devis_pricing_items").insert(payload);
      if (error) throw error;

      toast.success("Itens de precificação aplicados!");
      queryClient.invalidateQueries({ queryKey: ["devis-pricing-items", id] });
      queryClient.invalidateQueries({ queryKey: ["devis", id] });
    } catch (e: any) {
      toast.error("Erro ao aplicar precificação: " + e.message);
    }
  };

  const handleExportPdf = async () => {
    if (!devis) return;
    if (!isProposalComplete(devis.proposal_structure)) {
      const missing = getMissingClauses(devis.proposal_structure);
      toast.error(`Proposta incompleta — regere a proposta. Cláusulas faltantes: ${missing.join(", ")}`);
      return;
    }
    const client = clientsById[devis.client_id ?? ""];
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.zIndex = "-1";
    document.body.appendChild(host);
    const root = createRoot(host);
    try {
      // Carrega itens de precificação para o PDF
      const { data: pricingItems } = await supabase
        .from("devis_pricing_items")
        .select("*")
        .eq("devis_id", id!)
        .order("created_at", { ascending: true });

      // Garante versão bilíngue (PT + idioma do cliente) quando aplicável
      let effectiveDevis: any = devis;
      try {
        effectiveDevis = await ensureDevisBilingual(devis);
      } catch (e: any) {
        console.warn("ensureDevisBilingual falhou — exportando monolíngue:", e?.message);
      }
      await new Promise<void>((resolve) => {
        root.render(<DevisPdfTemplate devis={effectiveDevis} client={client} pricingItems={pricingItems || []} />);
        // aguarda render + carregamento da imagem
        setTimeout(resolve, 700);
      });
      const safeName = (client?.name || "cliente").replace(/[^\w\-]+/g, "_");
      await exportDevisPdfFromContainer(host, `Devis-${(devis?.devis_number ?? "") || (devis?.id ?? "").slice(0, 8)}-${safeName}.pdf`);
      toast.success("PDF gerado!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar PDF");
    } finally {
      root.unmount();
      host.remove();
    }
  };

  if (isLoading || !form) return <div className="text-muted-foreground">Carregando...</div>;
  if (!devis) return <div className="text-muted-foreground">Devis não encontrado.</div>;

  const sourceLang = (devis as any).source_language || "pt";
  const LANG_LABELS: Record<string, string> = { pt: "Português", fr: "Francês", en: "Inglês", es: "Espanhol" };

  const handleToggleTranslate = async () => {
    if (viewLang === "pt") {
      setViewLang("native");
      return;
    }
    if (translatedFields) {
      setViewLang("pt");
      return;
    }
    setTranslating(true);
    try {
      const fields: Record<string, any> = {
        title: devis.title || "",
        service_type: devis.service_type || "",
        responsible_sector: devis.responsible_sector || "",
        scope_description: devis.scope_description || "",
        proposal_structure: devis.proposal_structure || "",
        payment_terms: (devis as any).payment_terms || "",
        meeting_summary: devis.meeting_summary || "",
        meeting_report: devis.meeting_report || "",
        notes: devis.notes || "",
      };
      if (Array.isArray((devis as any).scope_items) && (devis as any).scope_items.length) {
        fields.scope_items = (devis as any).scope_items;
      }
      if (Array.isArray((devis as any).assumptions) && (devis as any).assumptions.length) {
        fields.assumptions = (devis as any).assumptions;
      }
      const { data, error } = await supabase.functions.invoke("translate-devis", {
        body: { fields, target_language: "pt", source_language: sourceLang },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTranslatedFields(data.translated);
      setViewLang("pt");
    } catch (e: any) {
      toast.error(e.message || "Falha ao traduzir");
    } finally {
      setTranslating(false);
    }
  };

  // Campos que existem em versão *_secondary (traduzida para o idioma do cliente)
  const SECONDARY_FIELDS = new Set([
    "title",
    "scope_description",
    "proposal_structure",
    "payment_terms",
  ]);

  const view = (key: string, fallback: string) => {
    // Toggle manual: usuário pediu para ver PT traduzido
    if (viewLang === "pt" && translatedFields && translatedFields[key]) return translatedFields[key];
    // Padrão: se o idioma detectado do cliente não for PT, mostra a versão no idioma do cliente
    if (viewLang === "native" && sourceLang !== "pt" && SECONDARY_FIELDS.has(key)) {
      const sec = (devis as any)?.[`${key}_secondary`];
      if (typeof sec === "string" && sec.trim().length > 0) return sec;
    }
    return fallback;
  };

  const client = clientsById[devis.client_id ?? ""];
  const responsavel = profilesById[devis.commercial_responsible ?? ""];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/comercial" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-display">{(devis?.title ?? "")}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span>Detalhes do devis</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">{formatDevisCode(devis.devis_number, devis.id)}</span>
              <CompanyBadge code={(devis as any)?.business_unit} />
              <div className="flex flex-wrap gap-1">
                {devis.devis_service_areas?.length > 0 ? (
                  devis.devis_service_areas.map((a: any) => (
                    <AreaBadge key={a.area_slug} companyCode={(devis as any)?.business_unit} areaSlug={a.area_slug} />
                  ))
                ) : (
                  <AreaBadge companyCode={(devis as any)?.business_unit} areaSlug={(devis as any)?.responsible_sector} />
                )}
              </div>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setAiSuggestions(null); const total = devis.total_amount ?? 0; const down = devis.down_payment_amount ?? 0; const pct = total > 0 ? Math.round((down / total) * 100) : 50; setForm({ ...devis, meeting_date: devis.meeting_date ? parseISO(devis.meeting_date) : undefined, deadline_date: devis.deadline_date ? parseISO(devis.deadline_date) : undefined, total_amount: String(total || ""), down_payment_amount: String(down || ""), down_payment_percentage: String(pct) }); }}>
                <X className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button onClick={() => update.mutate()} disabled={update.isPending}>
                <Save className="h-4 w-4 mr-2" /> Salvar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant={viewLang === "pt" ? "default" : "outline"}
                onClick={handleToggleTranslate}
                disabled={translating}
                title={`Idioma nativo: ${LANG_LABELS[sourceLang] || sourceLang}`}
              >
                {translating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
                {viewLang === "pt"
                  ? `Ver no original (${LANG_LABELS[sourceLang] || sourceLang})`
                  : "Traduzir para Português"}
              </Button>
              {devis.validated_at && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.origin}/proposta/aceite/${devis.accept_token}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link de aceite copiado!");
                  }}
                >
                  <LinkIcon className="h-4 w-4 mr-2" /> Copiar link de aceite
                </Button>
              )}
              <Button variant="outline" onClick={handleExportPdf}>
                <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
              </Button>
              {!!devis.validated_at &&
                ["pronta_para_envio", "rascunho", "reuniao_realizada", "proposta_em_geracao", "aguardando_validacao", "enviado"].includes(devis.status) && (
                <Button onClick={() => setSendOpen(true)} className="bg-green-600 hover:bg-green-700">
                  <Send className="h-4 w-4 mr-2" /> Enviar ao cliente
                </Button>
              )}
              <Button onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-2" /> Editar</Button>
            </>
          )}
        </div>
      </div>

      {viewLang === "pt" && sourceLang !== "pt" && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 flex items-center gap-2 text-sm">
          <Languages className="h-4 w-4 text-amber-600" />
          <span className="text-amber-700 dark:text-amber-400">
            Visualização traduzida — idioma nativo da proposta: <strong>{LANG_LABELS[sourceLang] || sourceLang}</strong>. O PDF e o envio ao cliente usam sempre o idioma original.
          </span>
        </div>
      )}


      {devis.accepted_at && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div className="text-sm">
            <span className="font-semibold text-green-700 dark:text-green-400">Aceita pelo cliente</span>
            <span className="text-muted-foreground ml-2">
              em {format(parseISO(devis.accepted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>
      )}
      {devis.accepted_at && !linkedService && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div className="text-sm">
              <span className="font-semibold text-amber-700 dark:text-amber-400">Conversão para operação pendente</span>
              <p className="text-muted-foreground">Esta proposta foi aceita. Clique no botão ao lado para iniciar a execução operacional.</p>
            </div>
          </div>
          <Button onClick={() => createService.mutate()} disabled={createService.isPending}>
            {createService.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Criar processo operacional
          </Button>
        </div>
      )}

      {devis.initial_charge_generated && (
        <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          <div className="text-sm">
            <span className="font-semibold text-blue-700 dark:text-blue-400">Cobrança inicial gerada</span>
            <span className="text-muted-foreground ml-2">
              50% do valor total ({fmtBRL(Number(devis.down_payment_amount) || Number(devis.total_amount) * 0.5)}) lançada no Financeiro
            </span>
          </div>
        </div>
      )}

      {linkedService && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div className="text-sm">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Case operacional criado</span>
              <span className="text-muted-foreground ml-2">
                Setor: {linkedService.responsible_sector || "—"} · Status: A iniciar
              </span>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/operacao" })}>
            Ver no módulo Operação
          </Button>
        </div>
      )}

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 mb-6">
          <TabsTrigger value="info" className="data-[state=active]:bg-primary">
            <Info className="h-4 w-4 mr-2" /> Informações
          </TabsTrigger>
          <TabsTrigger value="anexos" className="data-[state=active]:bg-primary">
            <Paperclip className="h-4 w-4 mr-2" /> Anexos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6 m-0">
          <Card>
            <CardHeader><CardTitle>Informações</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cliente */}
          <div>
            <Label>Cliente</Label>
            {editing ? (
              <Select value={form.client_id ?? ""} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : <p className="font-medium mt-1">{client?.name || "—"}</p>}
          </div>

          {/* Empresa responsável */}
          <div>
            <Label>Empresa responsável *</Label>
            {editing ? (
              <Select
                value={form.business_unit ?? ""}
                onValueChange={(v) => setForm({ ...form, business_unit: v as CompanyCode, responsible_sector: "" })}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
                <SelectContent>
                  {COMPANY_LIST.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-mono text-[10px] mr-2">{c.code}</span>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : <div className="mt-1"><CompanyBadge code={(devis as any)?.business_unit} /></div>}
          </div>

          {/* Áreas Responsáveis */}
          <div>
            <Label>Área(s) Responsável(is) *</Label>
            {editing ? (
              <div className="mt-1">
                <MultiAreaSelector
                  companyCode={form.business_unit}
                  selectedAreas={selectedAreas}
                  onChange={setSelectedAreas}
                />
              </div>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1">
                {devis.devis_service_areas?.length > 0 ? (
                  devis.devis_service_areas.map((a: any) => (
                    <AreaBadge key={a.area_slug} companyCode={(devis as any)?.business_unit} areaSlug={a.area_slug} />
                  ))
                ) : (
                  <AreaBadge companyCode={(devis as any)?.business_unit} areaSlug={(devis as any)?.responsible_sector} />
                )}
              </div>
            )}
          </div>

          {/* Data Reunião */}
          <div>
            <Label>Data da reunião</Label>
            {editing ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start font-normal", !form.meeting_date && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {form.meeting_date ? format(form.meeting_date, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.meeting_date} onSelect={(d) => setForm({ ...form, meeting_date: d })} initialFocus className={cn("p-3 pointer-events-auto")} locale={ptBR} />
                </PopoverContent>
              </Popover>
            ) : <p className="font-medium mt-1">{devis.meeting_date ? format(parseISO(devis.meeting_date), "dd/MM/yyyy") : "—"}</p>}
          </div>

          {/* Prazo (deadline) */}
          <div>
            <Label className={cn(editing && !form.deadline_date && "text-destructive font-bold animate-pulse")}>Prazo (deadline) *</Label>
            {editing ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start font-normal", !form.deadline_date && "border-destructive text-destructive shadow-[0_0_10px_rgba(239,68,68,0.1)]")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {form.deadline_date ? format(form.deadline_date, "dd/MM/yyyy") : "Selecionar prazo obrigatório"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.deadline_date} onSelect={(d) => setForm({ ...form, deadline_date: d, validation_deadline_defined: !!d })} initialFocus className={cn("p-3 pointer-events-auto")} locale={ptBR} />
                </PopoverContent>
              </Popover>
            ) : <p className={cn("font-medium mt-1", !devis.deadline_date && "text-destructive italic")}>{devis.deadline_date ? format(parseISO(devis.deadline_date), "dd/MM/yyyy") : "PENDENTE"}</p>}
          </div>


          {/* Responsável */}
          <div>
            <Label>Responsável comercial</Label>
            {editing ? (
              <Select value={form.commercial_responsible ?? ""} onValueChange={(v) => setForm({ ...form, commercial_responsible: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{profiles.map((p: any) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email}</SelectItem>)}</SelectContent>
              </Select>
            ) : <p className="font-medium mt-1">{responsavel?.full_name || responsavel?.email || "—"}</p>}
          </div>

          {/* Valor Total */}
          <div>
            <Label>Valor total</Label>
            {editing ? (
              <CurrencyInputBRL
                value={form.total_amount}
                onChange={(total) => {
                  const totalNum = Number(total) || 0;
                  const pctNum = Number(form.down_payment_percentage) || 50;
                  const down = (totalNum * (pctNum / 100)).toFixed(2);
                  setForm({
                    ...form,
                    total_amount: total,
                    down_payment_amount: total === "" ? "" : down,
                  });
                }}
              />
            ) : <p className="font-medium mt-1 text-lg">{fmtBRL(devis.total_amount)}</p>}
          </div>

          {/* Entrada */}
          <div>
            <div className="flex justify-between items-center">
              <Label>Valor de entrada</Label>
              {editing && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Input
                    type="number"
                    className="h-5 w-12 px-1 py-0 text-[10px]"
                    value={form.down_payment_percentage}
                    onChange={(e) => {
                      const pct = e.target.value;
                      const totalNum = Number(form.total_amount) || 0;
                      const down = (totalNum * (Number(pct) / 100)).toFixed(2);
                      setForm({
                        ...form,
                        down_payment_percentage: pct,
                        down_payment_amount: totalNum > 0 ? down : form.down_payment_amount
                      });
                    }}
                  />
                  <span>%</span>
                </div>
              )}
            </div>
            {editing ? (
              <CurrencyInputBRL
                value={form.down_payment_amount}
                onChange={(v) => {
                  const totalNum = Number(form.total_amount) || 0;
                  const pct = totalNum > 0 ? Math.round((Number(v) / totalNum) * 100) : 50;
                  setForm({ 
                    ...form, 
                    down_payment_amount: v,
                    down_payment_percentage: totalNum > 0 ? String(pct) : form.down_payment_percentage
                  });
                }}
              />
            ) : <p className="font-medium mt-1 text-lg">{fmtBRL(devis.down_payment_amount)}</p>}
          </div>

          {/* Saldo Final */}
          <div>
            <Label>Saldo final</Label>
            {editing ? (
              <Input 
                disabled 
                className="bg-muted" 
                value={fmtBRL((Number(form.total_amount) || 0) - (Number(form.down_payment_amount) || 0))} 
              />
            ) : (
              <p className="font-medium mt-1 text-lg">
                {fmtBRL((Number(devis.total_amount) || 0) - (Number(devis.down_payment_amount) || 0))}
              </p>
            )}
          </div>

          {/* Título */}
          <div className="md:col-span-2">
            <Label>Título</Label>
            {editing ? (
              <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            ) : <p className="font-medium mt-1">{view("title", devis?.title ?? "")}</p>}
          </div>

          {/* Relatório da reunião */}
          <div className="md:col-span-2">
            <Label>Relatório da reunião</Label>
            {editing ? (
              <div className="space-y-2">
                <Textarea rows={8} value={form.meeting_report ?? ""} onChange={(e) => setForm({ ...form, meeting_report: e.target.value })} placeholder="Descreva a reunião em detalhes para a IA gerar sugestões de proposta..." />
                <div className="flex flex-wrap gap-2">
                  {form.proposal_structure?.trim() ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (window.confirm("Isto irá sobrescrever os campos da proposta com uma versão refinada. Continuar?")) {
                          handleGenerate("final");
                        }
                      }}
                      disabled={generating || !form.meeting_report?.trim()}
                    >
                      {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      {generating ? "Refinando..." : "Refinar proposta"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleGenerate("draft")}
                      disabled={generating || !form.meeting_report?.trim()}
                    >
                      {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      {generating ? "Gerando..." : "Gerar proposta"}
                    </Button>
                  )}
                </div>
              </div>
            ) : <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{view("meeting_report", devis.meeting_report || "—")}</p>}
          </div>

          {/* Resumo */}
          <div className="md:col-span-2">
            <Label>Resumo da reunião</Label>
            {editing ? (
              <Textarea rows={4} value={form.meeting_summary ?? ""} onChange={(e) => setForm({ ...form, meeting_summary: e.target.value })} />
            ) : <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{view("meeting_summary", devis.meeting_summary || "—")}</p>}
          </div>

          {/* Observações */}
          <div className="md:col-span-2">
            <Label>Observações</Label>
            {editing ? (
              <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            ) : <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{view("notes", devis.notes || "—")}</p>}
          </div>

          {/* Campos da proposta — editáveis */}
          {editing && (
            <>
              <div className="md:col-span-2"><Label>Tipo de serviço</Label><Input value={form.service_type ?? ""} onChange={(e) => setForm({ ...form, service_type: e.target.value })} /></div>
              <div className="md:col-span-2">
                <Label>Área principal *</Label>
                <Select
                  value={form.responsible_sector ?? ""}
                  onValueChange={(v) => setForm({ ...form, responsible_sector: v })}
                  disabled={!isCompanyCode(form.business_unit)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isCompanyCode(form.business_unit) ? "Selecionar área" : "Selecione a empresa primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAreasFor(isCompanyCode(form.business_unit) ? (form.business_unit as CompanyCode) : null).map((a) => (
                      <SelectItem key={a.slug} value={a.slug}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2"><Label>Descrição do escopo</Label><Textarea rows={5} value={form.scope_description ?? ""} onChange={(e) => setForm({ ...form, scope_description: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Estrutura da proposta</Label><Textarea rows={8} value={form.proposal_structure ?? ""} onChange={(e) => setForm({ ...form, proposal_structure: e.target.value })} /></div>
            </>
          )}

          {/* Campos da proposta — somente leitura */}
          {!editing && (devis.service_type || devis.responsible_sector || devis.scope_description || devis.proposal_structure) && (
            <>
              {devis.service_type && <div className="md:col-span-2"><Label>Tipo de serviço</Label><p className="font-medium mt-1">{view("service_type", devis.service_type)}</p></div>}
              {devis.responsible_sector && <div className="md:col-span-2"><Label>Área principal</Label><div className="mt-1"><AreaBadge companyCode={(devis as any).business_unit} areaSlug={devis.responsible_sector} /></div></div>}
              {devis.scope_description && <div className="md:col-span-2"><Label>Descrição do escopo</Label><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{view("scope_description", devis.scope_description)}</p></div>}
              {devis.proposal_structure && <div className="md:col-span-2"><Label>Estrutura da proposta</Label><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{view("proposal_structure", devis.proposal_structure)}</p></div>}
            </>
          )}
        </CardContent>
      </Card>

      {/* Precificação */}
      {!editing && (
        <DevisPricingManager
          devisId={devis.id}
          pricingStatus={devis.pricing_status || "sem_precificacao"}
          currentTotal={devis.total_amount}
          onTotalUpdate={(newTotal) => {
            queryClient.invalidateQueries({ queryKey: ["devis", id] });
            const down = newTotal * 0.5;
            setForm((f: any) => ({ 
              ...f, 
              total_amount: String(newTotal),
              down_payment_amount: String(down.toFixed(2)),
              down_payment_percentage: "50"
            }));
          }}
        />
      )}

      {/* Validação Comercial */}
      <ValidationChecklist
        devis={devis}
        form={form}
        editing={editing}
        onToggle={(key, value) => setForm((f: any) => ({ ...f, [key]: value }))}
        profilesById={profilesById}
      />

      {/* AI Suggestions Block */}
      {editing && aiSuggestions && (
        <AISuggestionsBlock
          suggestions={aiSuggestions}
          onAccept={(key, value) => setForm((f: any) => ({ ...f, [key]: value }))}
          onAcceptAll={(values) => {
            setForm((f: any) => ({ ...f, ...values }));
            if (values.suggested_pricing_items?.length) handleAcceptPricingItems(values.suggested_pricing_items);
          }}
          onDismiss={() => setAiSuggestions(null)}
          onAcceptPricing={handleAcceptPricingItems}
        />
      )}

      <SendDevisDialog open={sendOpen} onOpenChange={setSendOpen} devis={devis} client={client} />
        </TabsContent>


        <TabsContent value="anexos">
          <Card className="border-white/10 bg-card/30 backdrop-blur-sm">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Anexos e Documentos</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <EntityAttachments entityType="devis" entityId={devis.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/comercial_/devis/$id")({
  component: DevisDetail,
});
