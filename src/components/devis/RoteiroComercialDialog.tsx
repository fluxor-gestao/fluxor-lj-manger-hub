import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, RotateCcw } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CheckItem {
  id: string;
  label: string;
}

interface Section {
  title: string;
  items: CheckItem[];
}

const SECTIONS: Section[] = [
  {
    title: "1. Cliente",
    items: [
      { id: "c1", label: "Nome completo" },
      { id: "c2", label: "Nacionalidade" },
      { id: "c3", label: "País/cidade de origem" },
      { id: "c4", label: "Empresa vinculada, se houver" },
      { id: "c5", label: "CNPJ/identificação da empresa" },
    ],
  },
  {
    title: "2. Objetivo da reunião",
    items: [
      { id: "o1", label: "O que o cliente deseja resolver?" },
      { id: "o2", label: "Qual problema principal?" },
      { id: "o3", label: "Qual resultado esperado?" },
    ],
  },
  {
    title: "3. Região de exploração/investimento",
    items: [
      { id: "r1", label: "País" },
      { id: "r2", label: "Estado" },
      { id: "r3", label: "Cidade" },
      { id: "r4", label: "Região/área de interesse" },
    ],
  },
  {
    title: "4. Serviços necessários",
    items: [
      { id: "s1", label: "Quais serviços devem ser executados?" },
      { id: "s2", label: "Existe serviço principal?" },
      { id: "s3", label: "Existem serviços complementares?" },
      { id: "s4", label: "Quais áreas do escritório serão ativadas?" },
    ],
  },
  {
    title: "5. Prazo",
    items: [
      { id: "p1", label: "Existe urgência?" },
      { id: "p2", label: "Existe deadline?" },
      { id: "p3", label: "O prazo depende de documentação ou terceiros?" },
    ],
  },
  {
    title: "6. Valores",
    items: [
      { id: "v1", label: "Existe orçamento estimado?" },
      { id: "v2", label: "Existe entrada?" },
      { id: "v3", label: "Existe recorrência mensal?" },
      { id: "v4", label: "É fixo, variável ou avulso?" },
    ],
  },
  {
    title: "7. Documentos",
    items: [
      { id: "d1", label: "Quais documentos foram citados?" },
      { id: "d2", label: "Quais documentos o cliente já possui?" },
      { id: "d3", label: "Quais documentos ainda precisa enviar?" },
    ],
  },
  {
    title: "8. Riscos e observações",
    items: [
      { id: "x1", label: "Existem riscos jurídicos, fiscais, ambientais, imobiliários ou operacionais?" },
      { id: "x2", label: "Existe ponto de atenção?" },
      { id: "x3", label: "Existe dependência externa?" },
    ],
  },
];

const ALL_IDS = SECTIONS.flatMap((s) => s.items.map((i) => i.id));

export default function RoteiroComercialDialog({ open, onOpenChange }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => setChecked(new Set());

  const checkedCount = checked.size;
  const totalCount = ALL_IDS.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Roteiro Comercial
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Checklist para reuniões comerciais. Marque os itens conforme forem
            confirmados na conversa.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {checkedCount}/{totalCount}
            </span>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh] px-6 py-4">
          <div className="space-y-6">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  {section.title}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item) => {
                    const isChecked = checked.has(item.id);
                    return (
                      <label
                        key={item.id}
                        className="flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors hover:bg-accent/50"
                        onClick={() => toggle(item.id)}
                      >
                        <Checkbox
                          checked={isChecked}
                          className="mt-0.5 shrink-0"
                          onCheckedChange={() => toggle(item.id)}
                        />
                        <span
                          className={`text-sm leading-snug ${
                            isChecked
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t flex items-center justify-between bg-muted/20">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpar marcações
          </Button>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
