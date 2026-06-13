import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Wrench, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type EntryType = "ajuste" | "melhoria" | "implementacao";

const META: Record<EntryType, { label: string; icon: any; cls: string }> = {
  implementacao: { label: "Implementação", icon: CheckCircle2, cls: "text-emerald-700 border-emerald-200 bg-emerald-50" },
  ajuste: { label: "Ajuste", icon: Wrench, cls: "text-rose-700 border-rose-200 bg-rose-50" },
  melhoria: { label: "Melhoria", icon: Sparkles, cls: "text-primary border-primary/20 bg-primary/5" },
};

export function PendingChangelogPanel() {
  const qc = useQueryClient();

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
    refetchInterval: 30_000,
  });

  const releaseNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("auto_release_changelog" as any, {
        _summary: null as any,
        _release_name: "Release manual",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (id) => {
      if (!id) toast.info("Não há alterações pendentes.");
      else toast.success("Nova versão publicada!");
      qc.invalidateQueries({ queryKey: ["changelog-pending"] });
      qc.invalidateQueries({ queryKey: ["system-versions"] });
      qc.invalidateQueries({ queryKey: ["current-system-version"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao publicar versão"),
  });

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Alterações pendentes
          </CardTitle>
          <CardDescription>
            Cada push no GitHub vira automaticamente uma nova versão (bump de patch). Use o botão abaixo apenas se precisar liberar agora.
          </CardDescription>
        </div>
        <Button
          onClick={() => releaseNow.mutate()}
          disabled={releaseNow.isPending || pending.length === 0}
          className="gap-2"
        >
          {releaseNow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          Liberar versão agora
          <Badge variant="secondary" className="ml-1">{pending.length}</Badge>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : pending.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground italic py-3">
            Sem alterações pendentes. Tudo já foi publicado em uma versão.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {pending.map((p) => {
              const meta = META[p.type as EntryType] ?? META.implementacao;
              const Icon = meta.icon;
              return (
                <li key={p.id} className="flex items-start gap-2 rounded border bg-card p-2 text-sm">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded border ${meta.cls}`}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  <span className="flex-1 leading-snug">{p.description}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
