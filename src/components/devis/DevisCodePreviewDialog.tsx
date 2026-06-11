import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Hash, FileText, ArrowRight, Gavel, Sprout, Calculator, Home, Briefcase } from "lucide-react";
import { COMPANY_BADGE_CLASS, COMPANY_SHORT } from "@/lib/companyCodes";

export type ServicePrefix = "DE" | "AM" | "CO" | "IM" | "GE";

const PREFIX_META: Record<ServicePrefix, { label: string; icon: any }> = {
  DE: { label: "Advocacia", icon: Gavel },
  AM: { label: "Ambiental", icon: Sprout },
  CO: { label: "Contábil", icon: Calculator },
  IM: { label: "Imobiliária", icon: Home },
  GE: { label: "Gestão", icon: Briefcase },
};

const PREFIX_LABEL: Record<ServicePrefix, string> = {
  DE: "Advocacia",
  AM: "Ambiental",
  CO: "Contábil",
  IM: "Imobiliária",
  GE: "Gestão",
};

export function inferServicePrefix(...sources: (string | null | undefined)[]): ServicePrefix {
  const text = sources.filter(Boolean).join(" ").toLowerCase();
  if (/(ambient|environment|ambiental|sustent)/.test(text)) return "AM";
  if (/(cont[áa]bil|cont[aá]bei|accounting|fiscal|tribut|imposto)/.test(text)) return "CO";
  if (/(imobili[áa]rio|imobili[áa]ria|real estate|im[óo]vel|im[óo]veis|loca[çc][ãa]o|aluguel)/.test(text)) return "IM";
  if (/(gest[ãa]o|management|administra[çc][ãa]o|consultoria)/.test(text)) return "GE";
  return "DE";
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientName?: string;
  initialPrefix: ServicePrefix;
  serviceTypeHint?: string;
  onConfirm: (data: { prefix: ServicePrefix; devis_number: string; service_type: string }) => void;
}

export default function DevisCodePreviewDialog({
  open,
  onOpenChange,
  clientName,
  initialPrefix,
  serviceTypeHint,
  onConfirm,
}: Props) {
  const [prefix, setPrefix] = useState<ServicePrefix>(initialPrefix);
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [manualSequence, setManualSequence] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (open) setPrefix(initialPrefix);
  }, [open, initialPrefix]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("next_devis_number", { _prefix: prefix });
        if (!cancelled) {
          const fetchedCode = error ? "" : (data as string);
          setCode(fetchedCode);
          // Extrair a sequência numérica do final (últimos 3 dígitos)
          if (fetchedCode) {
            const seq = fetchedCode.slice(-3);
            setManualSequence(seq);
          }
          setLoading(false);
        }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, prefix]);

  useEffect(() => {
    if (!code || !manualSequence) return;
    const ym = new Date().toISOString().slice(0, 10).replace(/-/g, "").slice(0, 6);
    const newCode = prefix + ym + manualSequence.padStart(3, "0");
    if (newCode !== code) {
      setCode(newCode);
    }
  }, [manualSequence, prefix, code]);

  const handleConfirm = () => {
    if (!code) return;
    onConfirm({
      prefix,
      devis_number: code,
      service_type: serviceTypeHint || PREFIX_LABEL[prefix],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" /> Código do Devis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {clientName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Cliente:</span>
              <span className="font-medium text-foreground">{clientName}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Tipo de serviço</Label>
            <RadioGroup
              value={prefix}
              onValueChange={(v) => setPrefix(v as ServicePrefix)}
              className="grid grid-cols-3 sm:grid-cols-5 gap-2"
            >
              {(Object.keys(PREFIX_META) as ServicePrefix[]).map((p) => {
                const Icon = PREFIX_META[p].icon;
                const isSelected = prefix === p;
                return (
                  <label
                    key={p}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-3 cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? `${COMPANY_BADGE_CLASS[p]} border-2 scale-105 shadow-sm` 
                        : "border-border hover:border-primary/30 hover:bg-accent/50 opacity-70"
                    }`}
                  >
                    <RadioGroupItem value={p} className="sr-only" />
                    <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold font-display leading-tight">{p}</span>
                      <span className="text-[10px] opacity-80 font-medium whitespace-nowrap">{COMPANY_SHORT[p]}</span>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          <div className="rounded-md border bg-muted/30 p-4 text-center space-y-3">
            <div className="text-xs text-muted-foreground">Código previsto</div>
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="text-2xl font-bold font-display tracking-wider tabular-nums">
                {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : code || "—"}
              </div>
              
              {!loading && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed w-full justify-center">
                  <Label htmlFor="sequence" className="text-[10px] text-muted-foreground whitespace-nowrap">
                    A partir de:
                  </Label>
                  <Input
                    id="sequence"
                    type="number"
                    min="1"
                    max="999"
                    value={manualSequence}
                    onChange={(e) => setManualSequence(e.target.value.slice(0, 3))}
                    className="h-7 w-20 text-center text-xs font-bold"
                  />
                </div>
              )}
            </div>
            <Badge variant="outline" className="text-[10px]">
              {PREFIX_LABEL[prefix]} · {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!code || loading}>
            Confirmar e gerar rascunho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
