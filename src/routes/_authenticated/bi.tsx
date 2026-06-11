import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, BriefcaseBusiness, DollarSign, LayoutDashboard, ShieldAlert, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessBiDashboard } from "@/lib/access";
import BIFinanceiro from "@/components/bi/BIFinanceiro";
import BIComercial from "@/components/bi/BIComercial";
import { cn } from "@/lib/utils";

const dashboards = [
  {
    id: "comercial",
    title: "Comercial",
    fullName: "Dashboard Comercial",
    icon: ShoppingCart,
    gradient: "from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9]",
    glow: "rgba(139, 92, 246, 0.3)",
    description: "Vendas, conversão e funil comercial",
    embedUrl:
      "https://app.powerbi.com/view?r=eyJrIjoiMDk0YTI0NmQtOTdjNC00ZGY1LTgyOTQtZjg0ZmZkNzY0MTE1IiwidCI6ImViYzMxZTJiLWE5OTYtNGQ4MS04NzIwLWRjNWNkYWQ4YzNmYyJ9",
  },
  {
    id: "financeiro",
    title: "Financeiro",
    fullName: "Dashboard Financeiro",
    icon: DollarSign,
    gradient: "from-[#0EA5E9] via-[#0284C7] to-[#0369A1]",
    glow: "rgba(14, 165, 233, 0.3)",
    description: "Receitas, despesas e fluxo de caixa",
    embedUrl: undefined as string | undefined,
  },
  {
    id: "operacao",
    title: "Operação",
    fullName: "Dashboard Operação",
    icon: BriefcaseBusiness,
    gradient: "from-[#10B981] via-[#059669] to-[#047857]",
    glow: "rgba(16, 185, 129, 0.3)",
    description: "Processos, prazos e produtividade",
    embedUrl: undefined as string | undefined,
  },
] as const;

type DashboardId = (typeof dashboards)[number]["id"];

function BI() {
  const { hasRole, roleLoading } = useAuth();
  const visibleDashboards = useMemo(() => dashboards.filter((d) => canAccessBiDashboard(d.id, hasRole)), [hasRole]);
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardId | null>(null);

  const activeDashboard =
    selectedDashboard && canAccessBiDashboard(selectedDashboard, hasRole)
      ? dashboards.find((dashboard) => dashboard.id === selectedDashboard)
      : undefined;

  if (!roleLoading && visibleDashboards.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="h-12 w-12 text-white/40" />
        <h1 className="text-xl font-semibold">Sem dashboards disponíveis</h1>
        <p className="max-w-sm text-sm text-white/40">
          Seu usuário não tem acesso a nenhum dashboard de BI. Fale com um administrador.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-[calc(100vh-4rem)] transition-all duration-700 rounded-xl overflow-hidden relative",
      "bg-[#F8FAFC]"
    )}>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className={cn(
              "font-display font-black tracking-tight transition-all duration-500",
              selectedDashboard ? "text-xl text-slate-900" : "text-4xl text-slate-900"
            )}>
              {selectedDashboard ? activeDashboard?.fullName : "Dashboards Gerenciais"}
            </h1>
            {!selectedDashboard && (
              <p className="text-slate-500 text-lg">
                Selecione uma área para visualizar os indicadores consolidados
              </p>
            )}
          </div>
          {selectedDashboard && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedDashboard(null)}
              className="h-9 px-4 bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm transition-all rounded-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à Seleção
            </Button>
          )}
        </div>


        <div 
          className={cn(
            "grid gap-6 transition-all duration-500 ease-in-out",
            selectedDashboard 
              ? "grid-cols-3 md:grid-cols-3" 
              : "grid-cols-1 md:grid-cols-3"
          )}
        >
          {visibleDashboards.map((dashboard) => {
            const Icon = dashboard.icon;
            const isActive = selectedDashboard === dashboard.id;

            return (
              <div
                key={dashboard.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDashboard(dashboard.id)}
                className={cn(
                  "group relative overflow-hidden cursor-pointer rounded-xl transition-all duration-300",
                  isActive 
                    ? "ring-2 ring-primary/20 shadow-md z-20 scale-[1.02] bg-white border-primary/20" 
                    : "opacity-90 hover:opacity-100 hover:scale-[1.01] bg-white border-slate-200",
                  selectedDashboard 
                    ? "h-[50px] md:h-[60px] border shadow-sm" 
                    : "h-[180px] md:h-[220px] border shadow-sm"
                )}
              >
                {/* Clean hover effect */}
                {!selectedDashboard && (
                  <div className="absolute inset-0 bg-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}

                <div className={cn(
                  "relative z-10 flex h-full transition-all duration-500 px-6",
                  selectedDashboard ? "items-center gap-4" : "flex-col justify-center"
                )}>
                  <div className={cn(
                    "flex items-center justify-center rounded-xl transition-all duration-500",
                    selectedDashboard 
                      ? "w-8 h-8 bg-slate-50 border border-slate-100" 
                      : "w-14 h-14 bg-white border border-slate-100 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
                  )}>
                    <Icon className={cn("drop-shadow-sm", selectedDashboard ? "h-4 w-4 text-slate-400" : "h-7 w-7 text-primary")} />
                  </div>
                  
                  <div className={cn(
                    "transition-all duration-500",
                    !selectedDashboard && "mt-4"
                  )}>
                    <h3 className={cn(
                      "font-display font-black tracking-tight leading-tight",
                      selectedDashboard ? "text-sm text-slate-500" : "text-2xl text-slate-900",
                      isActive && selectedDashboard && "text-slate-900"
                    )}>
                      {dashboard.title}
                    </h3>
                    {!selectedDashboard && (
                      <p className="text-slate-400 text-sm font-medium mt-1 max-w-[200px] line-clamp-2">
                        {dashboard.description}
                      </p>
                    )}
                  </div>

                  {isActive && selectedDashboard && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
              </div>

            );
          })}
        </div>
      </div>

      {activeDashboard ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-6">
          <Card className="overflow-hidden border-slate-200 shadow-xl bg-white">
            <CardContent className="p-0">
              {activeDashboard.id === "financeiro" ? (
                <div className="p-2"><BIFinanceiro /></div>
              ) : activeDashboard.id === "comercial" ? (
                <div className="p-2"><BIComercial /></div>
              ) : activeDashboard.embedUrl ? (
                <iframe
                  title={activeDashboard.title}
                  src={activeDashboard.embedUrl}
                  className="h-[75vh] w-full border-0"
                  allowFullScreen
                />
              ) : (
                <div className="flex min-h-[400px] items-center justify-center p-12 text-center">
                  <div className="max-w-xs">
                    <BarChart3 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900">Dashboard em Configuração</h3>
                    <p className="text-sm text-slate-500 mt-2">Estamos preparando os indicadores para este painel.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center animate-in fade-in duration-500 shadow-sm">
          <div className="mb-4 rounded-full bg-slate-50 p-4 shadow-inner">
            <LayoutDashboard className="h-8 w-8 text-slate-300" />
          </div>
          <p className="max-w-xs text-sm text-slate-500 font-medium">
            Selecione um dashboard para visualizar os indicadores.
          </p>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/bi")({
  component: BI,
});
