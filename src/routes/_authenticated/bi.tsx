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
      "bg-[#08111f]"
    )} style={{
      background: "linear-gradient(180deg, #08111f 0%, #0b1526 40%, #101827 100%)"
    }}>
      {/* Visual Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.05),transparent_50%)] pointer-events-none" />

      <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className={cn(
              "font-display font-black tracking-tight transition-all duration-500",
              selectedDashboard ? "text-xl text-white/90" : "text-4xl text-white"
            )}>
              {selectedDashboard ? activeDashboard?.fullName : "Dashboards Gerenciais"}
            </h1>
            {!selectedDashboard && (
              <p className="text-white/50 text-lg">
                Selecione uma área para visualizar os indicadores consolidados
              </p>
            )}
          </div>
          {selectedDashboard && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedDashboard(null)}
              className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all rounded-full backdrop-blur-md"
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
                  "group relative overflow-hidden cursor-pointer rounded-2xl transition-all duration-500",
                  isActive 
                    ? "ring-1 ring-white/30 shadow-[0_0_40px_rgba(255,255,255,0.1)] z-20 scale-[1.02]" 
                    : "opacity-80 hover:opacity-100 hover:scale-[1.01]",
                  selectedDashboard 
                    ? "h-[50px] md:h-[60px] bg-white/5 backdrop-blur-xl border border-white/10" 
                    : "h-[180px] md:h-[220px] bg-[#1a2233] border border-white/5"
                )}
                style={{
                  boxShadow: !selectedDashboard ? `0 10px 40px -10px ${dashboard.glow}` : undefined,
                  background: isActive && selectedDashboard ? `linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 100%)` : undefined
                }}
              >
                {/* Background Gradient for unselected state */}
                {!selectedDashboard && (
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br transition-all duration-700 opacity-10",
                    dashboard.gradient
                  )} />
                )}

                {/* Glow Effect for active */}
                {isActive && (
                   <div className="absolute inset-0 bg-white/5 animate-pulse" />
                )}

                {/* Modern Effects */}
                {!selectedDashboard && (
                  <>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.05),transparent)] opacity-60" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-white/5" />
                  </>
                )}

                <div className={cn(
                  "relative z-10 flex h-full transition-all duration-500 px-6",
                  selectedDashboard ? "items-center gap-4" : "flex-col justify-center"
                )}>
                  <div className={cn(
                    "flex items-center justify-center rounded-xl transition-all duration-500",
                    selectedDashboard 
                      ? "w-8 h-8 bg-white/10 border border-white/10" 
                      : "w-14 h-14 bg-white/5 border border-white/10 group-hover:scale-110 group-hover:rotate-3 shadow-2xl"
                  )}>
                    <Icon className={cn("drop-shadow-md", selectedDashboard ? "h-4 w-4 text-white/70" : "h-7 w-7 text-white")} />
                  </div>
                  
                  <div className={cn(
                    "transition-all duration-500",
                    !selectedDashboard && "mt-4"
                  )}>
                    <h3 className={cn(
                      "font-display font-black tracking-tight leading-tight",
                      selectedDashboard ? "text-sm text-white/70" : "text-2xl text-white",
                      isActive && selectedDashboard && "text-white"
                    )}>
                      {dashboard.title}
                    </h3>
                    {!selectedDashboard && (
                      <p className="text-white/40 text-sm font-medium mt-1 max-w-[200px] line-clamp-2">
                        {dashboard.description}
                      </p>
                    )}
                  </div>

                  {isActive && selectedDashboard && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]" />
                  )}
                </div>
              </div>

            );
          })}
        </div>
      </div>

      {activeDashboard ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-6">
          <Card className="overflow-hidden border border-white/5 shadow-2xl bg-white/[0.02] backdrop-blur-xl">

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
                    <BarChart3 className="mx-auto h-12 w-12 text-white/40/30 mb-4" />
                    <h3 className="text-lg font-semibold">Dashboard em Configuração</h3>
                    <p className="text-sm text-white/40 mt-2">Estamos preparando os indicadores para este painel.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center animate-in fade-in duration-500">
          <div className="mb-4 rounded-full bg-white/5 p-4 shadow-sm ring-1 ring-white/10">
            <LayoutDashboard className="h-8 w-8 text-white/20" />

          </div>
          <p className="max-w-xs text-sm text-white/40">
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
