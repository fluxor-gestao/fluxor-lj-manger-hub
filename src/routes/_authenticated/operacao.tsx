import { useMemo, useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KanbanSquare, List } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { NovoProcessoDialog } from "@/components/operacao/NovoProcessoDialog";
import { OperacaoKpis } from "@/components/operacao/OperacaoKpis";
import {
  OperacaoFilters,
  applyFilters,
  initialFilters,
  type OperacaoFilterState,
} from "@/components/operacao/OperacaoFilters";
import { OperacaoKanban } from "@/components/operacao/OperacaoKanban";
import { OperacaoLista } from "@/components/operacao/OperacaoLista";
import { ProcessoDetailSheet } from "@/components/operacao/ProcessoDetailSheet";
import {
  InsightsBlock,
  buildInsightsForBoard,
} from "@/components/operacao/InsightsOperacionais";
import type { OpStatus, ServiceLike } from "@/components/operacao/status";
import { useCompany } from "@/contexts/CompanyContext";
import { ActiveCompanyBanner } from "@/components/ActiveCompanyBanner";

export const Route = createFileRoute("/_authenticated/operacao")({
  component: OperacaoPage,
});

function OperacaoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { filterCode: companyCode } = useCompany();

  const [view, setView] = useState<"lista" | "kanban">("lista");
  const [filters, setFilters] = useState<OperacaoFilterState>({
    ...initialFilters,
    bu: companyCode || "all",
  });

  useEffect(() => {
    if (companyCode) {
      setFilters(f => ({ ...f, bu: companyCode }));
    }
  }, [companyCode]);
  const [detail, setDetail] = useState<ServiceLike | null>(null);

  const q = useQuery({
    queryKey: ["operacao-services", companyCode],
    queryFn: async () => {
      let qb = supabase
        .from("services")
        .select(
          "id, title, description, business_unit, responsible_sector, assigned_to, start_date, expected_end_date, actual_end_date, status, created_at, updated_at, client_id, devis_id, client:clients(name), devis:devis(id, devis_number), assignee:profiles!services_assigned_to_fkey(full_name)"
        )
        .order("updated_at", { ascending: false })
        .limit(1000);
      if (companyCode) qb = qb.eq("business_unit", companyCode);
      const { data, error } = await qb;
      if (error) {
        // fallback sem o join de profiles se a FK não existir
        let qb2 = supabase
          .from("services")
          .select(
            "id, title, description, business_unit, responsible_sector, assigned_to, start_date, expected_end_date, actual_end_date, status, created_at, updated_at, client_id, devis_id, client:clients(name), devis:devis(id, devis_number)"
          )
          .order("updated_at", { ascending: false })
          .limit(1000);
        if (companyCode) qb2 = qb2.eq("business_unit", companyCode);
        const { data: d2, error: e2 } = await qb2;
        if (e2) throw e2;
        return (d2 ?? []) as unknown as ServiceLike[];
      }
      return (data ?? []) as unknown as ServiceLike[];
    },
  });

  const profilesQ = useQuery({
    queryKey: ["operacao-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").limit(500);
      return (data ?? []) as { user_id: string; full_name: string | null }[];
    },
  });

  const services = q.data ?? [];

  const responsibles = useMemo(() => {
    const map = new Map<string, string>();
    (profilesQ.data ?? []).forEach((p) => {
      if (p.user_id) map.set(p.user_id, p.full_name || p.user_id.slice(0, 8));
    });
    services.forEach((s) => {
      if (s.assigned_to && !map.has(s.assigned_to)) {
        map.set(s.assigned_to, s.assignee?.full_name || s.assigned_to.slice(0, 8));
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [profilesQ.data, services]);

  const businessUnits = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => s.business_unit && set.add(s.business_unit));
    return Array.from(set).sort();
  }, [services]);

  const areas = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => s.responsible_sector && set.add(s.responsible_sector));
    return Array.from(set).sort();
  }, [services]);

  const filtered = useMemo(() => applyFilters(services, filters), [services, filters]);

  const boardInsights = useMemo(() => buildInsightsForBoard(filtered), [filtered]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OpStatus }) => {
      const patch: any = { status };
      if (status === "concluido") patch.actual_end_date = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("services").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["operacao-services"] });
      if (detail && detail.id === vars.id) {
        setDetail((d) => (d ? { ...d, status: vars.status } : d));
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      toast.success("Processo excluído");
      qc.invalidateQueries({ queryKey: ["operacao-services"] });
      if (detail && detail.id === id) setDetail(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir"),
  });

  const handleDelete = (s: ServiceLike) => {
    const label = s.title || "este processo";
    if (window.confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) {
      deleteService.mutate(s.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/hub" })}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">Operação</h1>
            <p className="text-sm text-muted-foreground">
              Gestão de processos, tarefas, prazos e execução operacional
            </p>
            <ActiveCompanyBanner className="mt-2" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as "lista" | "kanban")}
            size="sm"
            variant="outline"
          >
            <ToggleGroupItem value="lista" aria-label="Lista">
              <List className="h-4 w-4" />
              Lista
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanban">
              <KanbanSquare className="h-4 w-4" />
              Kanban
            </ToggleGroupItem>
          </ToggleGroup>
          <NovoProcessoDialog />
        </div>
      </div>

      {/* KPIs */}
      <OperacaoKpis services={services} />

      {/* Insights globais */}
      {boardInsights.length > 0 ? <InsightsBlock items={boardInsights} /> : null}

      {/* Filtros */}
      <OperacaoFilters
        value={filters}
        onChange={setFilters}
        responsibles={responsibles}
        businessUnits={businessUnits}
        areas={areas}
      />

      {/* Conteúdo */}
      {q.isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Carregando processos…</div>
      ) : view === "kanban" ? (
        <OperacaoKanban
          services={filtered}
          onChangeStatus={(id, status) => updateStatus.mutate({ id, status })}
          onOpenDetail={(s) => setDetail(s)}
        />
      ) : (
        <OperacaoLista
          services={filtered}
          onChangeStatus={(id, status) => updateStatus.mutate({ id, status })}
          onOpenDetail={(s) => setDetail(s)}
        />
      )}

      <ProcessoDetailSheet
        service={detail}
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        onChangeStatus={(id, status) => updateStatus.mutate({ id, status })}
      />
    </div>
  );
}
