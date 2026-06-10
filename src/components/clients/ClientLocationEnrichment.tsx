import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Loader2, Check, X, AlertTriangle, Globe, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientCompany?: string | null;
  clientDocument?: string | null;
  onEnriched: () => void;
}

export type EnrichmentResult = {
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  source: string;
};

export default function ClientLocationEnrichment({ 
  open, 
  onOpenChange, 
  clientId, 
  clientName, 
  clientCompany, 
  clientDocument,
  onEnriched 
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<EnrichmentResult | null>(null);
  const [customSearch, setCustomSearch] = useState("");

  const handleSearch = async (query?: string) => {
    setLoading(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-client-location", {
        body: {
          cnpj: !query ? clientDocument : undefined,
          name: query || clientCompany || clientName,
        },
      });

      if (error) throw error;
      if (!data || Object.keys(data).length === 0) {
        toast.error("Nenhuma localização encontrada.");
        return;
      }

      setResults(data as EnrichmentResult);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao buscar localização: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!results) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          address: results.address,
          city: results.city,
          state: results.state,
          country: results.country,
          zip_code: results.zip_code,
          latitude: results.latitude,
          longitude: results.longitude,
          location_status: "localizada",
          location_updated_at: new Date().toISOString(),
        } as any)
        .eq("id", clientId);

      if (error) throw error;

      toast.success("Localização atualizada com sucesso!");
      onEnriched();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Enriquecer Localização
          </DialogTitle>
          <DialogDescription>
            Busca automática de endereço para <strong>{clientCompany || clientName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!results && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Busca sugerida</Label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 justify-start h-auto py-2 px-3 text-left block overflow-hidden" 
                    onClick={() => handleSearch()}
                    disabled={loading}
                  >
                    <div className="text-xs font-bold truncate">{clientDocument ? `CNPJ: ${clientDocument}` : (clientCompany || clientName)}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{clientCompany || clientName}</div>
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou busca personalizada</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input 
                  placeholder="Nome da empresa, Cidade..." 
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch(customSearch)}
                />
                <Button size="icon" onClick={() => handleSearch(customSearch)} disabled={loading || !customSearch.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {loading && (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">Consultando fontes de dados...</p>
            </div>
          )}

          {results && (
            <Card className="border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-sm text-primary flex items-center gap-1">
                  <Check className="h-4 w-4" /> Endereço Encontrado
                </h4>
                <Badge variant="outline" className="text-[10px] bg-background">
                  {results.source}
                </Badge>
              </div>
              
              <div className="grid gap-2 text-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-muted-foreground font-bold">Logradouro</span>
                  <span>{results.address}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Cidade</span>
                    <span>{results.city}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Estado</span>
                    <span>{results.state}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">País</span>
                    <span>{results.country}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">CEP</span>
                    <span>{results.zip_code}</span>
                  </div>
                </div>
                <div className="pt-2 flex items-center gap-4 border-t border-primary/10">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <Globe className="h-3 w-3" /> {results.latitude.toFixed(6)}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <Globe className="h-3 w-3" /> {results.longitude.toFixed(6)}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {results ? (
            <>
              <Button variant="ghost" onClick={() => setResults(null)} disabled={saving}>
                Tentar outra
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Confirmar e Salvar
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}