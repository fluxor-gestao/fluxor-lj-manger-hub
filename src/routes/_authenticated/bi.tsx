import { useEffect, useState } from "react";
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
  const visibleDashboards = dashboards.filter((d) => canAccessBiDashboard(d.id, hasRole));
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardId | null>(null);

  const activeDashboard =
    selectedDashboard && canAccessBiDashboard(selectedDashboard, hasRole)
      ? dashboards.find((dashboard) => dashboard.id === selectedDashboard)
      : undefined;

  if (!roleLoading && visibleDashboards.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Sem dashboards disponíveis</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Seu usuário não tem acesso a nenhum dashboard de BI. Fale com um administrador.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-[calc(100vh-4rem)] transition-colors duration-500 rounded-xl overflow-hidden",
      "bg-gradient-to-br from-background via-background to-muted/20"
    )}>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className={cn(
              "font-display font-black tracking-tight text-foreground transition-all duration-500",
              selectedDashboard ? "text-2xl" : "text-4xl"
            )}>
              {selectedDashboard ? activeDashboard?.fullName : "Dashboards Gerenciais"}
            </h1>
            {!selectedDashboard && (
              <p className="text-muted-foreground text-lg">
                Selecione uma área para visualizar os indicadores consolidados
              </p>
            )}
          </div>
          {selectedDashboard && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedDashboard(null)}
              className="h-10 px-4 bg-background/50 hover:bg-primary/5 border-primary/10 transition-all rounded-full"
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
                  "group relative overflow-hidden cursor-pointer rounded-2xl transition-all duration-500 border border-white/10",
                  isActive 
                    ? "ring-2 ring-primary/20 shadow-[0_0_30px_rgba(0,0,0,0.2)] z-20" 
                    : "shadow-lg hover:shadow-2xl hover:-translate-y-1",
                  selectedDashboard 
                    ? "h-[60px] md:h-[80px]" 
                    : "h-[180px] md:h-[220px]"
                )}
                style={{
                  boxShadow: !selectedDashboard ? `0 10px 40px -10px ${dashboard.glow}` : undefined
                }}
              >
                {/* Background Gradient */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br transition-all duration-700",
                  dashboard.gradient,
                  selectedDashboard && !isActive ? "opacity-20 saturate-50" : "opacity-100"
                )} />

                {/* Modern Effects */}
                {!selectedDashboard && (
                  <>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2),transparent)] opacity-60" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-white/5" />
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                  </>
                )}

                <div className={cn(
                  "relative z-10 flex h-full transition-all duration-500 px-6",
                  selectedDashboard ? "items-center gap-3" : "flex-col justify-center"
                )}>
                  <div className={cn(
                    "flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/20 shadow-lg transition-all duration-500",
                    selectedDashboard ? "w-10 h-10" : "w-14 h-14 group-hover:scale-110 group-hover:rotate-3"
                  )}>
                    <Icon className={cn("text-white drop-shadow-md", selectedDashboard ? "h-5 w-5" : "h-7 w-7")} />
                  </div>
                  
                  <div className={cn(
                    "transition-all duration-500",
                    !selectedDashboard && "mt-4"
                  )}>
                    <h3 className={cn(
                      "font-display font-black text-white tracking-tight leading-tight",
                      selectedDashboard ? "text-lg" : "text-2xl"
                    )}>
                      {dashboard.title}
                    </h3>
                    {!selectedDashboard && (
                      <p className="text-white/80 text-sm font-medium mt-1 max-w-[200px] line-clamp-2">
                        {dashboard.description}
                      </p>
                    )}
                  </div>

                  {isActive && selectedDashboard && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_10px_white]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeDashboard ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-6">
          <Card className="overflow-hidden border-0 shadow-2xl bg-background/50 backdrop-blur-sm">
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
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold">Dashboard em Configuração</h3>
                    <p className="text-sm text-muted-foreground mt-2">Estamos preparando os indicadores para este painel.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-muted-foreground/10 bg-muted/5 p-12 text-center animate-in fade-in duration-500">
          <div className="mb-4 rounded-full bg-background p-4 shadow-sm ring-1 ring-border">
            <LayoutDashboard className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
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
