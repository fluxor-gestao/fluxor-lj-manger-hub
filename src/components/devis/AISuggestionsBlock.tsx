import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sparkles, Check, X, CheckCheck, Calculator } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type AISuggestions = {
  service_type: string;
  responsible_sector: string;
  scope_description: string;
  proposal_structure: string;
  suggested_pricing_items?: {
    service_name: string;
    quantity: number;
    unit_price: number;
  }[];
};

type FieldKey = keyof Omit<AISuggestions, "suggested_pricing_items">;

const FIELD_META: { key: FieldKey; label: string; rows?: number; type: "input" | "textarea" }[] = [
  { key: "service_type", label: "Tipo de serviço", type: "input" },
  { key: "responsible_sector", label: "Setor responsável", type: "input" },
  { key: "scope_description", label: "Descrição do escopo", type: "textarea", rows: 5 },
  { key: "proposal_structure", label: "Estrutura da proposta", type: "textarea", rows: 8 },
];

interface Props {
  suggestions: AISuggestions;
  onAccept: (key: FieldKey, value: string) => void;
  onAcceptAll: (values: AISuggestions) => void;
  onDismiss: () => void;
  onAcceptPricing?: (items: NonNullable<AISuggestions["suggested_pricing_items"]>) => void;
}

export default function AISuggestionsBlock({ suggestions, onAccept, onAcceptAll, onDismiss, onAcceptPricing }: Props) {
  const [draft, setDraft] = useState<AISuggestions>(suggestions);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({
    service_type: false,
    responsible_sector: false,
    scope_description: false,
    proposal_structure: false,
    pricing: false,
  });

  const handleAccept = (key: FieldKey) => {
    onAccept(key, draft[key]);
    setAccepted((s) => ({ ...s, [key]: true }));
  };

  const handleAcceptAll = () => {
    onAcceptAll(draft);
    if (draft.suggested_pricing_items?.length && onAcceptPricing && !accepted.pricing) {
      onAcceptPricing(draft.suggested_pricing_items);
    }
    setAccepted({ service_type: true, responsible_sector: true, scope_description: true, proposal_structure: true, pricing: true });
  };

  const handleAcceptPricing = () => {
    if (draft.suggested_pricing_items?.length && onAcceptPricing) {
      onAcceptPricing(draft.suggested_pricing_items);
      setAccepted((s) => ({ ...s, pricing: true }));
    }
  };

  return (
    <Card className="border-primary/40 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-primary">Sugestões da IA</h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={handleAcceptAll}>
            <CheckCheck className="h-4 w-4 mr-1" /> Aceitar todas
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            <X className="h-4 w-4 mr-1" /> Descartar
          </Button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground italic">
        A IA utilizou a **Tabela Oficial de Preços 2026** como referência para os valores abaixo.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {FIELD_META.map((f) => (
            <div key={f.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{f.label}</Label>
                <Button
                  size="sm"
                  variant={accepted[f.key] ? "secondary" : "outline"}
                  onClick={() => handleAccept(f.key)}
                >
                  <Check className="h-3 w-3 mr-1" /> {accepted[f.key] ? "Aceito" : "Aceitar"}
                </Button>
              </div>
              {f.type === "input" ? (
                <Input
                  value={draft[f.key] as string}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                />
              ) : (
                <Textarea
                  rows={f.rows}
                  value={draft[f.key] as string}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  className="font-mono text-xs"
                />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <Label className="text-sm font-bold">Precificação Sugerida</Label>
            </div>
            {draft.suggested_pricing_items && draft.suggested_pricing_items.length > 0 && (
              <Button
                size="sm"
                variant={accepted.pricing ? "secondary" : "outline"}
                onClick={handleAcceptPricing}
                disabled={accepted.pricing}
              >
                <Check className="h-3 w-3 mr-1" /> {accepted.pricing ? "Aplicado" : "Aplicar Preços"}
              </Button>
            )}
          </div>

          {draft.suggested_pricing_items && draft.suggested_pricing_items.length > 0 ? (
            <div className="rounded-md border bg-background overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="h-8 py-0">
                    <TableHead className="text-[10px] h-8">Serviço</TableHead>
                    <TableHead className="text-[10px] text-right h-8">Qtd</TableHead>
                    <TableHead className="text-[10px] text-right h-8">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.suggested_pricing_items.map((item, i) => (
                    <TableRow key={i} className="h-8 py-0">
                      <TableCell className="text-[10px] py-1 font-medium">{item.service_name}</TableCell>
                      <TableCell className="text-[10px] py-1 text-right">{item.quantity}</TableCell>
                      <TableCell className="text-[10px] py-1 text-right font-mono">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.unit_price * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="text-[10px] font-bold py-1">TOTAL</TableCell>
                    <TableCell className="text-[10px] font-bold text-right py-1">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        draft.suggested_pricing_items.reduce((s, i) => s + (i.unit_price * i.quantity), 0)
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground p-8 text-center border border-dashed rounded-md">
              Nenhuma sugestão de precificação baseada na tabela foi identificada.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}