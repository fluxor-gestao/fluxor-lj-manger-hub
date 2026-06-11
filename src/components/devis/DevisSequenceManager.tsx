import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Hash, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type SequenceConfig = {
  next_number: number;
};

const PREFIXES = ["DE", "AM", "CO", "IM", "GE"] as const;
type Prefix = typeof PREFIXES[number];

const PREFIX_LABELS: Record<Prefix, string> = {
  DE: "Direito Estratégico",
  AM: "Ambiental",
  CO: "Contabilidade",
  IM: "Imobiliário",
  GE: "Gestão & Consultoria",
};

export function DevisSequenceManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["commercial-settings", "devis-sequence"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_settings")
        .select("*")
        .like("key", "devis_sequence_%");
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateSequence = useMutation({
    mutationFn: async ({ prefix, nextNumber }: { prefix: string; nextNumber: number }) => {
      const key = `devis_sequence_${prefix}`;
      const { error } = await supabase
        .from("commercial_settings")
        .upsert({
          key,
          value: { next_number: nextNumber },
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração de sequência atualizada!");
      queryClient.invalidateQueries({ queryKey: ["commercial-settings"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSave = (prefix: Prefix) => {
    const val = editingValues[prefix];
    if (!val) return;
    const num = parseInt(val);
    if (isNaN(num) || num < 1) {
      toast.error("O número deve ser pelo menos 1");
      return;
    }
    updateSequence.mutate({ prefix, nextNumber: num });
  };

  const getNextNumber = (prefix: Prefix) => {
    const setting = settings.find(s => s.key === `devis_sequence_${prefix}`);
    return (setting?.value as SequenceConfig)?.next_number ?? 1;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          Sequencial do Devis
        </CardTitle>
        <CardDescription>
          Defina o próximo número sequencial para cada unidade de negócio. 
          O sistema garantirá que não haja duplicidade usando o maior entre este valor e o último Devis criado no mês.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {PREFIXES.map((prefix) => {
            const current = getNextNumber(prefix);
            const isEditing = editingValues[prefix] !== undefined;
            const displayValue = isEditing ? editingValues[prefix] : String(current);

            return (
              <div key={prefix} className="flex flex-col gap-2 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg font-display text-primary">{prefix}</span>
                    <span className="text-xs text-muted-foreground">{PREFIX_LABELS[prefix]}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    Próximo: {current.toString().padStart(3, "0")}
                  </Badge>
                </div>
                
                <div className="flex items-end gap-2 mt-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Alterar próximo número</Label>
                    <Input
                      type="number"
                      min="1"
                      max="999"
                      value={displayValue}
                      onChange={(e) => setEditingValues({ ...editingValues, [prefix]: e.target.value })}
                      placeholder="Ex: 001"
                      className="h-9 font-mono font-bold"
                    />
                  </div>
                  <Button 
                    size="sm" 
                    className="h-9"
                    disabled={!isEditing || updateSequence.isPending}
                    onClick={() => handleSave(prefix)}
                  >
                    {updateSequence.isPending && updateSequence.variables?.prefix === prefix ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: "outline" | "default", className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
      variant === "outline" ? "border border-muted-foreground/20 text-muted-foreground" : "bg-primary text-primary-foreground"
    } ${className}`}>
      {children}
    </span>
  );
}
