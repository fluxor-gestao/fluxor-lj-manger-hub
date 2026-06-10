import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Check, AlertCircle, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type Stats = {
  total: number;
  processed: number;
  found: number;
  pending: number;
  errors: number;
};

export default function BulkClientLocationEnrichment({ open, onOpenChange, onComplete }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    processed: 0,
    found: 0,
    pending: 0,
    errors: 0,
  });
  const [currentClientName, setCurrentClientName] = useState("");

  const { data: pendingCount = 0, refetch: refetchCount } = useQuery({
    queryKey: ["clients", "pending-location-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .or("location_status.eq.pendente,location_status.is.null");
      if (error) throw error;
      return count || 0;
    },
    enabled: open && !isRunning,
  });

  const startProcessing = async () => {
    setIsRunning(true);
    const initialPending = pendingCount;
    setStats({
      total: initialPending,
      processed: 0,
      found: 0,
      pending: 0,
      errors: 0,
    });

    try {
      // Process in small batches to avoid timeouts and rate limits
      let hasMore = true;
      while (hasMore && isRunning) {
        const { data: clients, error } = await supabase
          .from("clients")
          .select("id, name, company, document")
          .or("location_status.eq.pendente,location_status.is.null")
          .limit(5);

        if (error) throw error;
        if (!clients || clients.length === 0) {
          hasMore = false;
          break;
        }

        for (const client of clients) {
          if (!isRunning) break;
          
          setCurrentClientName(client.company || client.name);
          
          try {
            const { data, error: enrichError } = await supabase.functions.invoke("enrich-client-location", {
              body: {
                cnpj: client.document,
                name: client.company || client.name,
              },
            });

            if (enrichError) throw enrichError;

            if (data && data.latitude && data.longitude) {
              const { error: updateError } = await supabase
                .from("clients")
                .update({
                  address: data.address,
                  city: data.city,
                  state: data.state,
                  country: data.country,
                  zip_code: data.zip_code,
                  latitude: data.latitude,
                  longitude: data.longitude,
                  location_status: "localizada",
                  location_updated_at: new Date().toISOString(),
                } as any)
                .eq("id", client.id);

              if (updateError) throw updateError;
              
              setStats(prev => ({ ...prev, processed: prev.processed + 1, found: prev.found + 1 }));
            } else {
              // Mark as explicitly pending if not found by AI
              await supabase
                .from("clients")
                .update({ location_status: "pendente" } as any)
                .eq("id", client.id);
              
              setStats(prev => ({ ...prev, processed: prev.processed + 1, pending: prev.pending + 1 }));
            }
          } catch (e) {
            console.error(`Error processing ${client.name}:`, e);
            setStats(prev => ({ ...prev, processed: prev.processed + 1, errors: prev.errors + 1 }));
          }
          
          // Small delay between calls to be respectful to APIs
          await new Promise(r => setTimeout(r, 500));
        }

        // Check if we should continue
        if (clients.length < 5) hasMore = false;
      }
    } catch (e: any) {
      toast.error("Erro no processamento em massa: " + e.message);
    } finally {
      setIsRunning(false);
      setCurrentClientName("");
      onComplete();
      refetchCount();
    }
  };

  const stopProcessing = () => {
    setIsRunning(false);
    toast.info("Processamento interrompido.");
  };

  const resetStats = () => {
    setStats({
      total: 0,
      processed: 0,
      found: 0,
      pending: 0,
      errors: 0,
    });
    refetchCount();
  };

  const progressValue = stats.total > 0 ? (stats.processed / stats.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Enriquecimento em Massa
          </DialogTitle>
          <DialogDescription>
            Atualize automaticamente a localização de clientes pendentes usando IA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!isRunning && stats.processed === 0 && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Existem <strong>{pendingCount}</strong> clientes com localização pendente.
              </p>
              <p className="text-xs text-muted-foreground">
                O processo pode levar alguns minutos. Recomendamos processar em lotes.
              </p>
            </div>
          )}

          {(isRunning || stats.processed > 0) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Progresso</span>
                  <span>{stats.processed} / {stats.total}</span>
                </div>
                <Progress value={progressValue} className="h-2" />
                {currentClientName && (
                  <p className="text-[10px] text-muted-foreground truncate animate-pulse">
                    Processando: {currentClientName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3 bg-emerald-500/5 border-emerald-500/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-600">Localizados</span>
                    <Check className="h-3 w-3 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{stats.found}</p>
                </Card>
                <Card className="p-3 bg-amber-500/5 border-amber-500/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-600">Pendentes</span>
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
                </Card>
                <Card className="p-3 bg-rose-500/5 border-rose-500/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-rose-600">Erros</span>
                    <AlertCircle className="h-3 w-3 text-rose-500" />
                  </div>
                  <p className="text-2xl font-bold text-rose-700">{stats.errors}</p>
                </Card>
                <Card className="p-3 bg-slate-500/5 border-slate-500/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-600">Total</span>
                    <Loader2 className="h-3 w-3 text-slate-500" />
                  </div>
                  <p className="text-2xl font-bold text-slate-700">{stats.processed}</p>
                </Card>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!isRunning && stats.processed === 0 && (
            <Button className="w-full" onClick={startProcessing} disabled={pendingCount === 0}>
              <Play className="h-4 w-4 mr-2" /> Iniciar Processamento
            </Button>
          )}

          {isRunning && (
            <Button variant="destructive" className="w-full" onClick={stopProcessing}>
              <Pause className="h-4 w-4 mr-2" /> Interromper
            </Button>
          )}

          {!isRunning && stats.processed > 0 && (
            <div className="flex flex-col w-full gap-2">
              <Button className="w-full" onClick={resetStats}>
                <RotateCcw className="h-4 w-4 mr-2" /> Limpar e Reiniciar
              </Button>
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}