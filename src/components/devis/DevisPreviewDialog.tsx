import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  ExternalLink, 
  User, 
  DollarSign, 
  Layers, 
  Calendar, 
  Info,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import { formatDevisCode } from "@/lib/formatDevis";
import { findArea } from "@/lib/businessAreas";
import { getStatusLabel, getStatusBadgeClass } from "@/lib/devisStatus";
import DevisPdfTemplate from "./DevisPdfTemplate";
import { useNavigate } from "@tanstack/react-router";

const BRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

interface DevisPreviewDialogProps {
  devisId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DevisPreviewDialog({ devisId, open, onOpenChange }: DevisPreviewDialogProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"info" | "pdf">("info");

  const { data: devis, isLoading, error } = useQuery({
    queryKey: ["devis-detail", devisId],
    queryFn: async () => {
      if (!devisId) return null;
      const { data, error } = await supabase
        .from("devis")
        .select(`
          *,
          client:clients(*),
          devis_service_areas(area_slug),
          responsible:profiles!commercial_responsible(full_name, email)
        `)
        .eq("id", devisId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!devisId && open,
  });

  if (!devisId) return null;

  const handleOpenFull = () => {
    onOpenChange(false);
    navigate({ to: "/comercial/devis/$id", params: { id: devisId } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-white/10 bg-[#0B1120] text-slate-200">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Devis {devis ? formatDevisCode(devis.devis_number, devis.id) : "..."}
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium">
                  {devis?.client?.name || "Carregando cliente..."}
                </DialogDescription>
              </div>
            </div>
            {devis && (
              <Badge className={getStatusBadgeClass(devis.status)}>
                {getStatusLabel(devis.status)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 border-b border-white/5 shrink-0">
            <TabsList className="bg-white/5 border border-white/10 p-1 mb-2">
              <TabsTrigger value="info" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <Info className="h-4 w-4 mr-2" /> Resumo
              </TabsTrigger>
              <TabsTrigger value="pdf" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <FileText className="h-4 w-4 mr-2" /> Preview PDF
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col h-64 items-center justify-center p-6 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mb-2" />
                <p className="font-bold text-white">Erro ao carregar Devis</p>
                <p className="text-sm text-slate-400">Não foi possível recuperar os detalhes deste registro.</p>
              </div>
            ) : devis ? (
              <>
                <TabsContent value="info" className="p-6 m-0 space-y-6">
                  {/* Cards de KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <ValueCard 
                      label="Valor Total" 
                      value={BRL(devis.total_amount)} 
                      icon={DollarSign}
                      color="text-emerald-400"
                    />
                    <ValueCard 
                      label="Entrada" 
                      value={BRL(devis.down_payment_amount || (devis.total_amount * 0.5))} 
                      icon={ArrowRight}
                      color="text-amber-400"
                    />
                    <ValueCard 
                      label="Prazo" 
                      value={devis.deadline_date ? new Date(devis.deadline_date).toLocaleDateString() : "—"} 
                      icon={Calendar}
                      color="text-blue-400"
                    />
                    <ValueCard 
                      label="Reunião" 
                      value={devis.meeting_date ? new Date(devis.meeting_date).toLocaleDateString() : "—"} 
                      icon={Clock}
                      color="text-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Coluna Esquerda: Detalhes do Cliente e Responsável */}
                    <div className="space-y-6">
                      <section>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3 flex items-center gap-2">
                          <User className="h-3 w-3" /> Detalhes do Cliente
                        </h4>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                          <DetailRow label="Razão Social" value={devis.client?.name} />
                          <DetailRow label="CNPJ/CPF" value={devis.client?.document} />
                          <DetailRow label="Cidade" value={devis.client?.city} />
                        </div>
                      </section>

                      <section>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3 flex items-center gap-2">
                          <Info className="h-3 w-3" /> Responsável Comercial
                        </h4>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                          <p className="font-bold text-white">{devis.responsible?.full_name || "—"}</p>
                          <p className="text-xs text-slate-400">{devis.responsible?.email || "—"}</p>
                        </div>
                      </section>
                    </div>

                    {/* Coluna Direita: Áreas e Escopo */}
                    <div className="space-y-6">
                      <section>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3 flex items-center gap-2">
                          <Layers className="h-3 w-3" /> Áreas de Atuação
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {devis.devis_service_areas?.map((a: any) => (
                            <Badge key={a.area_slug} variant="outline" className="bg-primary/10 border-primary/20 text-primary-foreground font-semibold py-1">
                              {findArea(devis.business_unit, a.area_slug)?.label || a.area_slug}
                            </Badge>
                          ))}
                          {!devis.devis_service_areas?.length && <p className="text-sm text-slate-500 italic">Nenhuma área vinculada</p>}
                        </div>
                      </section>

                      <section>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3 flex items-center gap-2">
                          <FileText className="h-3 w-3" /> Resumo do Escopo
                        </h4>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                          <p className="text-sm text-slate-300 leading-relaxed line-clamp-6 whitespace-pre-wrap">
                            {devis.scope_description || devis.meeting_summary || "Sem descrição disponível."}
                          </p>
                        </div>
                      </section>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pdf" className="p-0 m-0 h-[500px] overflow-auto bg-slate-100 flex justify-center">
                  <div className="scale-[0.85] origin-top shadow-2xl my-4">
                    <DevisPdfTemplate 
                      devis={devis} 
                      client={devis.client} 
                    />
                  </div>
                </TabsContent>
              </>
            ) : null}
          </div>
        </Tabs>

        <DialogFooter className="p-6 border-t border-white/5 bg-white/5 shrink-0 flex items-center justify-between sm:justify-between gap-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">
            Fechar
          </Button>
          <Button onClick={handleOpenFull} className="font-bold bg-primary hover:bg-primary/90 text-white">
            <ExternalLink className="h-4 w-4 mr-2" /> Abrir Devis completo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValueCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center text-center">
      <Icon className={cn("h-4 w-4 mb-2", color)} />
      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">{label}</span>
      <span className="text-sm font-black text-white">{value}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-bold text-white text-right truncate">{value || "—"}</span>
    </div>
  );
}
