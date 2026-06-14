import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Sparkles, CheckCircle2, UserPlus, FileText, Check, X, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { MultiAreaSelector } from "./MultiAreaSelector";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { LogoGlobeAnimation } from "../LogoGlobeAnimation";
import FilePreview from "./FilePreview";
import DevisCodePreviewDialog, { inferServicePrefix } from "./DevisCodePreviewDialog";

export type AnalyzedClient = {
  name: string;
  email: string;
  phone: string;
  document: string;
  type: "PF" | "PJ" | "";
  address: string;
  city: string;
  notes: string;
};

export type AnalyzedDevis = {
  title: string;
  service_type: string;
  responsible_sector: string;
  responsible_sectors: string[];
  scope_description: string;
  proposal_structure: string;
  scope_items: { letter: string; title: string; description: string; amount: number; confidence?: number; is_catalog_item?: boolean }[];
  suggested_pricing_items?: { service_name: string; quantity: number; unit_price: number }[];
  total_amount: number;
  deadline_date: string;
};

export type AnalyzedPayload = {
  detected_language: "pt" | "fr" | "en" | "es";
  client_id?: string;
  client: AnalyzedClient;
  meeting: { date: string; summary: string; report: string };
  devis: AnalyzedDevis;
};

export type ConfirmedAtaResult = {
  client_id: string;
  payload: AnalyzedPayload;
  devis_code?: { prefix: string; devis_number: string; service_type: string };
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clients: any[];
  onConfirm: (result: ConfirmedAtaResult) => void;
}

const LANG_LABEL: Record<string, string> = {
  pt: "Português",
  fr: "Français",
  en: "English",
  es: "Español",
  auto: "Detectar automaticamente",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalize(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export default function UploadAtaDialog({ open, onOpenChange, clients, onConfirm }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [langHint, setLangHint] = useState<string>("auto");
  const [analyzing, setAnalyzing] = useState(false);
  const [payload, setPayload] = useState<AnalyzedPayload | null>(null);
  const [editClient, setEditClient] = useState<AnalyzedClient | null>(null);
  const [matchMode, setMatchMode] = useState<"existing" | "new">("new");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [meetingDate, setMeetingDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [pendingResult, setPendingResult] = useState<ConfirmedAtaResult | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);

  const reset = () => {
    setStep(1);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setLangHint("auto");
    setAnalyzing(false);
    setPayload(null);
    setEditClient(null);
    setMatchMode("new");
    setSelectedClientId("");
    setCreating(false);
    setProgress(0);
    setPendingResult(null);
    setShowCodeDialog(false);
  };

  const requestDevisCode = (result: ConfirmedAtaResult) => {
    setPendingResult(result);
    setShowCodeDialog(true);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const matches = useMemo(() => {
    if (!payload) return { exact: null as any, suggestions: [] as any[] };
    const c = payload.client;
    const docNorm = normalize(c.document);
    const emailNorm = (c.email || "").toLowerCase().trim();
    const nameNorm = normalize(c.name);

    const exact = clients.find(
      (cl: any) =>
        (docNorm && normalize(cl.document) === docNorm) ||
        (emailNorm && (cl.email || "").toLowerCase().trim() === emailNorm),
    );
    const suggestions = exact
      ? []
      : clients.filter((cl: any) => {
          if (!nameNorm) return false;
          const n = normalize(cl.name);
          return n && (n.includes(nameNorm) || nameNorm.includes(n));
        }).slice(0, 5);
    return { exact, suggestions };
  }, [payload, clients]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      if (selectedFile.size > 15 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máx 15 MB)");
        return;
      }
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setProgress(5);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) return prev;
        const increment = prev < 30 ? 5 : prev < 60 ? 2 : prev < 85 ? 1 : 0.5;
        return +(prev + increment).toFixed(1);
      });
    }, 800);

    try {
      const b64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("analyze-meeting-report", {
        body: {
          file_base64: b64,
          file_name: file.name,
          mime_type: file.type,
          language_hint: langHint,
        },
      });
      
      clearInterval(interval);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setProgress(100);
      await new Promise(r => setTimeout(r, 800));

      const p = data.payload as AnalyzedPayload;
      
      let finalDate = ""; // Forçar preenchimento manual se não identificado
      
      if (p.meeting.date || p.devis.deadline_date) {
        const dateToTry = p.devis.deadline_date || p.meeting.date;
        const parsed = parseISO(dateToTry);
        if (isValid(parsed)) {
          finalDate = dateToTry;
        }
      }
      
      p.meeting.date = finalDate;

      setPayload(p);
      setEditClient(p.client);
      setMeetingDate(finalDate);
      setSelectedAreas(p.devis.responsible_sectors || (p.devis.responsible_sector ? [p.devis.responsible_sector] : []));
      
      if (p.client_id) {
        setMatchMode("existing");
        setSelectedClientId(p.client_id);
      } else {
        const docNorm = normalize(p.client.document);
        const emailNorm = (p.client.email || "").toLowerCase().trim();
        const exact = clients.find(
          (cl: any) =>
            (docNorm && normalize(cl.document) === docNorm) ||
            (emailNorm && (cl.email || "").toLowerCase().trim() === emailNorm),
        );
        if (exact) {
          setMatchMode("existing");
          setSelectedClientId(exact.id);
        } else {
          setMatchMode("new");
        }
      }
      
      // Auto-confirm based on analysis results
      let clientId = p.client_id;
      if (!clientId) {
        const docNorm = normalize(p.client.document);
        const emailNorm = (p.client.email || "").toLowerCase().trim();
        const exact = clients.find(
          (cl: any) =>
            (docNorm && normalize(cl.document) === docNorm) ||
            (emailNorm && (cl.email || "").toLowerCase().trim() === emailNorm),
        );
        if (exact) {
          clientId = exact.id;
        }
      }

      // Se não encontrou cliente exato, ainda precisamos criar um ou deixar o usuário escolher?
      // O critério de aceite diz: "clientes existentes ou opção de cadastrar novo"
      // Se a IA não vinculou, e não achamos exato, vamos para o Step 4 apenas para decidir o cliente?
      // "Remover a tela intermediária... redirecionar automaticamente"
      // Vou tentar criar o cliente se não existir e for seguro (tem nome).
      
      if (!clientId && p.client.name) {
        const { data: newClient, error: clientErr } = await supabase
          .from("clients")
          .insert({
            name: p.client.name,
            email: p.client.email || null,
            phone: p.client.phone || null,
            document: p.client.document || null,
            type: (p.client.type || "PJ") as "PF" | "PJ",
            address: p.client.address || null,
            city: p.client.city || null,
            notes: p.client.notes || null,
          })
          .select("id")
          .single();
        
        if (!clientErr && newClient) {
          clientId = newClient.id;
          toast.success("Novo cliente cadastrado automaticamente");
        }
      }

      if (clientId) {
        const finalPayload = {
          ...p,
          meeting: { ...p.meeting, date: finalDate || format(new Date(), "yyyy-MM-dd") },
          devis: { 
            ...p.devis, 
            responsible_sectors: p.devis.responsible_sectors || (p.devis.responsible_sector ? [p.devis.responsible_sector] : []),
            responsible_sector: p.devis.responsible_sectors?.[0] || p.devis.responsible_sector || ""
          }
        };
        requestDevisCode({ client_id: clientId, payload: finalPayload });
      } else {
        // Fallback para o Step 4 apenas se não conseguirmos resolver o cliente automaticamente
        setStep(4);
      }
    } catch (e: any) {
      clearInterval(interval);
      toast.error(e.message || "Falha ao analisar a ata");
      setStep(1);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!payload) return;
    
    if (!meetingDate) {
      toast.error("O prazo (deadline) é obrigatório.");
      return;
    }

    setCreating(true);

    try {
      let clientId = selectedClientId;

      if (matchMode === "new") {
        if (!editClient?.name?.trim()) {
          toast.error("Nome do cliente obrigatório");
          setCreating(false);
          return;
        }
        const { data, error } = await supabase
          .from("clients")
          .insert({
            name: editClient.name,
            email: editClient.email || null,
            phone: editClient.phone || null,
            document: editClient.document || null,
            type: (editClient.type || "PJ") as "PF" | "PJ",
            address: editClient.address || null,
            city: editClient.city || null,
            notes: editClient.notes || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        clientId = data.id;
        toast.success("Cliente criado");
      }

      if (!clientId) {
        toast.error("Selecione ou crie um cliente");
        setCreating(false);
        return;
      }

      const finalPayload = {
        ...payload,
        meeting: { ...payload.meeting, date: meetingDate },
        devis: { 
          ...payload.devis, 
          responsible_sectors: selectedAreas,
          responsible_sector: selectedAreas[0] || ""
        }
      };
      requestDevisCode({ client_id: clientId, payload: finalPayload });
    } catch (e: any) {
      toast.error(e.message || "Falha ao confirmar");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload de Relatório / Ata
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 flex-wrap">
          <span className={cn(step >= 1 && "text-primary font-medium")}>1. Upload</span>
          <span>→</span>
          <span className={cn(step >= 2 && "text-primary font-medium")}>2. Confirmação</span>
          <span>→</span>
          <span className={cn(step >= 3 && "text-primary font-medium")}>3. Análise IA</span>
          <span>→</span>
          <span className={cn((showCodeDialog || step >= 4) && "text-primary font-medium")}>4. Código</span>
          <span>→</span>
          <span className={cn(step >= 4 && "text-primary font-medium")}>5. Revisão</span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Card className="p-6 border-dashed border-2 text-center space-y-3">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <Label htmlFor="ata-file" className="cursor-pointer text-primary underline">
                  Selecionar arquivo
                </Label>
                <Input
                  id="ata-file"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX ou TXT • até 15 MB</p>
              </div>
              {file && (
                <Badge variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" /> {file.name}
                </Badge>
              )}
            </Card>

            <div className="space-y-2">
              <Label>Idioma do documento</Label>
              <Select value={langHint} onValueChange={setLangHint}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LANG_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button onClick={() => setStep(2)} disabled={!file}>
                Próximo <CheckCircle2 className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && file && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-medium text-lg">Confirme o documento</h3>
              <p className="text-sm text-muted-foreground">Verifique se este é o arquivo correto antes de iniciar a análise pela IA.</p>
            </div>

            <Card className="overflow-hidden border-2 border-primary/20 bg-background p-3">
              <FilePreview file={file} previewUrl={previewUrl} />
            </Card>

            <DialogFooter className="flex justify-between items-center sm:justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground">
                <X className="h-4 w-4 mr-2" /> Trocar arquivo
              </Button>
              <Button onClick={() => { setStep(3); handleAnalyze(); }} className="bg-primary hover:bg-primary/90">
                <Sparkles className="h-4 w-4 mr-2" /> Confirmar e Analisar com IA
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="py-12 flex flex-col items-center gap-6">
            <LogoGlobeAnimation className="mb-2" />
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-xl text-primary font-display">Inteligência Artificial em ação</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Analisando os detalhes da ata para estruturar sua proposta comercial com precisão.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end text-xs mb-1">
                  <span className="text-muted-foreground font-medium uppercase tracking-wider">Progresso da análise</span>
                  <span className="text-primary font-bold text-sm">{Math.floor(progress)}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-muted-foreground/5 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2 pt-2">
                {[
                  { id: 1, label: "Ata recebida", threshold: 5 },
                  { id: 2, label: "Identificando cliente", threshold: 15 },
                  { id: 3, label: "Verificando base de clientes", threshold: 30 },
                  { id: 4, label: "Consultando áreas cadastradas", threshold: 50 },
                  { id: 5, label: "Consultando serviços da precificação", threshold: 70 },
                  { id: 6, label: "Sugerindo serviços compatíveis", threshold: 85 },
                  { id: 7, label: "Preparando revisão do Devis", threshold: 95 },
                  { id: 8, label: "Pronto para revisar", threshold: 100 },
                ].map((item) => {
                  const isDone = progress >= item.threshold;
                  const thresholdsList = [0, 5, 15, 30, 50, 70, 85, 95];
                  const isCurrent = progress < item.threshold && (item.id === 1 || progress >= thresholdsList[item.id - 1]);
                  return (
                    <div key={item.id} className={cn("flex items-center gap-3 text-xs transition-all duration-500 py-1.5 px-3 rounded-lg border", isDone ? "text-green-600 bg-green-50/50 border-green-100" : isCurrent ? "text-primary font-bold bg-primary/5 border-primary/10 animate-pulse" : "text-muted-foreground opacity-50")}>
                      <div className={cn("flex items-center justify-center h-5 w-5 rounded-full border transition-all duration-500", isDone ? "bg-green-500 border-green-500 text-white" : isCurrent ? "bg-primary/10 border-primary text-primary" : "bg-muted/50 border-muted-foreground/20 text-muted-foreground")}>
                        {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : isCurrent ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-[10px] font-bold">{item.id}</span>}
                      </div>
                      <span className="flex-1">{item.label}</span>
                      {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && payload && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <Badge variant="outline">Idioma: {LANG_LABEL[payload.detected_language] || payload.detected_language}</Badge>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" />
                <span className="font-semibold text-primary">Prazo (Deadline) *</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-7 text-[10px] px-2 py-0", !meetingDate && "border-destructive text-destructive animate-pulse")}>
                      {meetingDate ? format(parseISO(meetingDate), "dd/MM/yyyy") : "Selecionar prazo"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar 
                      mode="single" 
                      selected={meetingDate ? parseISO(meetingDate) : undefined} 
                      onSelect={(d) => d && setMeetingDate(format(d, "yyyy-MM-dd"))} 
                      initialFocus 
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>


            <Card className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Cliente</h3>
              {matchMode === "existing" ? (
                <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">{clients.find(c => c.id === selectedClientId)?.name}</p>
                    <p className="text-xs text-muted-foreground">{clients.find(c => c.id === selectedClientId)?.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setMatchMode("new")}>Trocar</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs">Razão Social</Label>
                    <Input value={editClient?.name || ""} onChange={e => { const val = e.target.value; setEditClient(prev => prev ? ({ ...prev, name: val }) : null); }} />
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Devis estruturado</h3>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <Label className="text-xs">Título</Label>
                  <p className="font-medium">{payload.devis.title || "—"}</p>
                </div>
                <div className="space-y-2 mt-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-primary" /> Áreas sugeridas</Label>
                  <MultiAreaSelector companyCode="" selectedAreas={selectedAreas} onChange={setSelectedAreas} placeholder="Selecione as áreas..." />
                </div>
                <div>
                  <Label className="text-xs">Valor total</Label>
                  <p className="font-medium font-mono text-primary">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(payload.devis.total_amount || 0)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" /> Itens e Compatibilidade</h3>
              <div className="space-y-3">
                {payload.devis.scope_items.map((item, idx) => (
                  <div key={idx} className="p-2 border rounded text-xs space-y-1 bg-muted/20">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold">{item.letter}) {item.title}</span>
                      <span className="font-mono text-primary font-bold">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.amount)}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 italic">{item.description}</p>
                    
                    {!item.is_catalog_item || item.title.includes("[NÃO CADASTRADO]") ? (
                      <Badge variant="destructive" className="text-[9px] py-0 h-4">Item não existe no catálogo</Badge>
                    ) : item.confidence !== undefined && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all", item.confidence > 0.8 ? "bg-green-500" : item.confidence > 0.5 ? "bg-yellow-500" : "bg-red-500")} 
                            style={{ width: `${item.confidence * 100}%` }} 
                          />
                        </div>
                        <span className="text-[9px] font-medium text-muted-foreground">Match: {Math.round(item.confidence * 100)}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={handleConfirm} disabled={creating || (matchMode === "existing" && !selectedClientId)}>
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirmar e abrir Devis
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
