import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronDown, FileText, Briefcase } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NovaFaturaAvulsaDialog } from "@/components/operacao/NovaFaturaAvulsaDialog";

export function NovoProcessoDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [faOpen, setFaOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    business_unit: "",
    responsible_sector: "",
    start_date: "",
    expected_end_date: "",
  });

  const { data: units = [] } = useQuery({
    queryKey: ["catalog", "business_units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_units")
        .select("code, name")
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["business-areas", form.business_unit],
    enabled: !!form.business_unit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_areas")
        .select("slug, label")
        .eq("business_unit", form.business_unit)
        .eq("is_active", true)
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("services").insert({
        title: form.title,
        description: form.description || null,
        business_unit: form.business_unit || null,
        responsible_sector: form.responsible_sector || null,
        start_date: form.start_date || null,
        expected_end_date: form.expected_end_date || null,
        assigned_to: user?.id ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Processo criado");
      qc.invalidateQueries({ queryKey: ["operacao-services"] });
      setOpen(false);
      setForm({ title: "", description: "", business_unit: "", responsible_sector: "", start_date: "", expected_end_date: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar"),
  });

  return (
    <>
      <div className="inline-flex rounded-md overflow-hidden border border-primary/40">
        <Button size="sm" className="rounded-none" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo processo
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="rounded-none border-l border-primary-foreground/20 px-2">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Briefcase className="h-4 w-4 mr-2" /> Novo processo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFaOpen(true)}>
              <FileText className="h-4 w-4 mr-2" /> Nova Fatura Avulsa (FA)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NovaFaturaAvulsaDialog open={faOpen} onOpenChange={setFaOpen} />

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo processo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Unidade de negócio</Label>
              <Select value={form.business_unit} onValueChange={(v) => setForm({ ...form, business_unit: v, responsible_sector: "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u: any) => (
                    <SelectItem key={u.code} value={u.code}>{u.code} — {u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Setor responsável</Label>
              <Select value={form.responsible_sector} onValueChange={(v) => setForm({ ...form, responsible_sector: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a: any) => (
                    <SelectItem key={a.slug} value={a.slug}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Início</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Previsão</Label>
              <Input type="date" value={form.expected_end_date} onChange={(e) => setForm({ ...form, expected_end_date: e.target.value })} />
            </div>
          </div>
          <Button className="w-full" disabled={!form.title || create.isPending} onClick={() => create.mutate()}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
