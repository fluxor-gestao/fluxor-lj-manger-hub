import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Rocket, Wrench, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type EntryType = "ajuste" | "melhoria" | "implementacao";

const TYPE_META: Record<EntryType, { label: string; icon: any; cls: string }> = {
  implementacao: { label: "Implementação", icon: CheckCircle2, cls: "text-emerald-600 border-emerald-200 bg-emerald-50" },
  ajuste: { label: "Ajuste", icon: Wrench, cls: "text-rose-600 border-rose-200 bg-rose-50" },
  melhoria: { label: "Melhoria", icon: Sparkles, cls: "text-primary border-primary/20 bg-primary/5" },
};

export function ChangelogManager() {
  const qc = useQueryClient();
  const [type, setType] = useState<EntryType>("implementacao");
  const [description, setDescription] = useState("");
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [releaseName, setReleaseName] = useState("");
  const [summary, setSummary] = useState("");

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["changelog-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("changelog_entries" as any)
        .select("*")
        .is("version_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error("Descreva o item");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("changelog_entries" as any).insert({
        type,
        description: description.trim(),
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item adicionado ao changelog");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["changelog-pending"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao adicionar"),
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("changelog_entries" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["changelog-pending"] }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  const release = useMutation({
    mutationFn: async () => {
      if (!version.trim() || !releaseName.trim() || !summary.trim()) {
        throw new Error("Preencha versão, nome e resumo");
      }
      if (pending.length === 0) throw new Error("Não há itens pendentes para lançar");
      const { data, error } = await supabase.rpc("release_system_version" as any, {
        _version: version.trim(),
        _release_name: releaseName.trim(),
        _summary: summary.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(`Versão ${version} lançada com ${pending.length} itens`);
      setReleaseOpen(false);
      setVersion(""); setReleaseName(""); setSummary("");
      qc.invalidateQueries({ queryKey: ["changelog-pending"] });
      qc.invalidateQueries({ queryKey: ["system-versions"] });
      qc.invalidateQueries({ queryKey: ["current-system-version"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao lançar versão"),
  });

  const grouped: Record<EntryType, any[]> = {
    implementacao: pending.filter((p) => p.type === "implementacao"),
    ajuste: pending.filter((p) => p.type === "ajuste"),
    melhoria: pending.filter((p) => p.type === "melhoria"),
  };

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Changelog Contínuo
          </CardTitle>
          <CardDescription>
            Acumule ajustes, melhorias e implementações. Ao lançar uma nova versão, todos os itens pendentes serão associados a ela.
          </CardDescription>
        </div>
        <Dialog open={releaseOpen} onOpenChange={setReleaseOpen}>
          <DialogTrigger asChild>
            <Button disabled={pending.length === 0} className="gap-2">
              <Rocket className="h-4 w-4" /> Lançar nova versão
              <Badge variant="secondary" className="ml-1">{pending.length}</Badge>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lançar nova versão</DialogTitle>
              <DialogDescription>
                {pending.length} itens pendentes serão vinculados a esta versão.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Número da versão</Label>
                <Input placeholder="ex: 1.2.2" value={version} onChange={(e) => setVersion(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Nome do release</Label>
                <Input placeholder="ex: Changelog Contínuo" value={releaseName} onChange={(e) => setReleaseName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Resumo</Label>
                <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Breve descrição da atualização" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setReleaseOpen(false)}>Cancelar</Button>
              <Button onClick={() => release.mutate()} disabled={release.isPending}>
                {release.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
                Lançar versão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto] items-end rounded-lg border bg-muted/30 p-4">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="implementacao">Implementação</SelectItem>
                <SelectItem value="melhoria">Melhoria</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input
              placeholder="O que foi feito?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && description.trim()) addEntry.mutate(); }}
            />
          </div>
          <Button onClick={() => addEntry.mutate()} disabled={addEntry.isPending || !description.trim()} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : pending.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6 italic">
            Nenhum item pendente. Adicione ajustes, melhorias e implementações conforme forem feitas.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.keys(TYPE_META) as EntryType[]).map((t) => {
              const meta = TYPE_META[t];
              const Icon = meta.icon;
              const items = grouped[t];
              return (
                <div key={t} className="space-y-2">
                  <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wide px-2 py-1 rounded border ${meta.cls}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                    <Badge variant="outline" className="ml-auto">{items.length}</Badge>
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((item) => (
                      <li key={item.id} className="group flex items-start gap-2 rounded border bg-card p-2 text-sm">
                        <span className="flex-1 leading-snug">{item.description}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-40 group-hover:opacity-100"
                          onClick={() => removeEntry.mutate(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                    {items.length === 0 && (
                      <li className="text-xs text-muted-foreground italic px-2">—</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
