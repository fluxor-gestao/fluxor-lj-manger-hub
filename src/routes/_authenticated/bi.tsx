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
    title: "Dashboard Comercial",
    icon: ShoppingCart,
    gradient: "from-purple-500 to-purple-700",
    embedUrl:
      "https://app.powerbi.com/view?r=eyJrIjoiMDk0YTI0NmQtOTdjNC00ZGY1LTgyOTQtZjg0ZmZkNzY0MTE1IiwidCI6ImViYzMxZTJiLWE5OTYtNGQ4MS04NzIwLWRjNWNkYWQ4YzNmYyJ9",
  },
  {
    id: "financeiro",
    title: "Dashboard Financeiro",
    icon: DollarSign,
    gradient: "from-blue-500 to-blue-700",
    embedUrl: undefined as string | undefined,
  },
  {
    id: "operacao",
    title: "Dashboard Operação",
    icon: BriefcaseBusiness,
    gradient: "from-emerald-600 to-emerald-800",
    embedUrl: undefined as string | undefined,
  },
] as const;

type DashboardId = (typeof dashboards)[number]["id"];

function BI() {
  const { hasRole, roleLoading } = useAuth();
  const visibleDashboards = dashboards.filter((d) => canAccessBiDashboard(d.id, hasRole));
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardId | null>(null);

  // Removida a auto-seleção conforme solicitado
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Business Intelligence</h1>
          {!selectedDashboard && (
            <p className="text-muted-foreground mt-1">
              Selecione um painel para visualizar os indicadores estratégicos.
            </p>
          )}
        </div>
        <Button variant="ghost" onClick={() => window.history.back()} className="sm:self-start opacity-70 hover:opacity-100">
          Sair
        </Button>
      </div>

      <div 
        className={cn(
          "grid gap-4 transition-all duration-300 ease-in-out",
          selectedDashboard 
            ? "grid-cols-3 md:grid-cols-3" 
            : "grid-cols-1 md:grid-cols-3 py-8"
        )}
      >
        {visibleDashboards.map((dashboard) => {
          const Icon = dashboard.icon;
          const isActive = selectedDashboard === dashboard.id;

          return (
            <Card
              key={dashboard.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedDashboard(dashboard.id)}
              className={cn(
                "group relative overflow-hidden cursor-pointer border-0 shadow-lg transition-all duration-300 ease-out",
                isActive 
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background z-20" 
                  : "grayscale-[0.3] hover:grayscale-0 opacity-80 hover:opacity-100",
                selectedDashboard 
                  ? "min-h-[60px] p-3" 
                  : "min-h-[280px] p-8 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-2"
              )}
            >
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
                dashboard.gradient,
                selectedDashboard ? "opacity-90" : "opacity-100"
              )} />
              
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className={cn(
                "relative z-10 flex h-full transition-all duration-300",
                selectedDashboard ? "flex-row items-center gap-3" : "flex-col items-start"
              )}>
                <div className={cn(
                  "rounded-xl bg-white/20 p-3 backdrop-blur-md transition-all duration-300 group-hover:scale-105",
                  selectedDashboard ? "p-1.5" : "p-4"
                )}>
                  <Icon 
                    className={cn(
                      "text-white drop-shadow-sm",
                      selectedDashboard ? "h-5 w-5" : "h-10 w-10"
                    )} 
                    strokeWidth={selectedDashboard ? 2 : 1.5} 
                  />
                </div>
                
                <div className={cn(
                  "transition-all duration-300",
                  selectedDashboard ? "flex-1" : "mt-6 w-full"
                )}>
                  <h3 className={cn(
                    "font-display font-bold text-white tracking-wide",
                    selectedDashboard ? "text-sm" : "text-2xl"
                  )}>
                    {dashboard.title.replace("Dashboard ", "")}
                  </h3>
                  {!selectedDashboard && (
                    <>
                      <p className="text-white/80 text-sm mt-2 line-clamp-2">
                        Acesse métricas de {dashboard.title.toLowerCase()} em tempo real.
                      </p>
                      <div className="mt-8 flex items-center text-sm font-semibold text-white">
                        <span>Abrir Dashboard</span>
                        <ArrowLeft className="ml-2 h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {activeDashboard ? (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 ease-out">
          <Card className="overflow-hidden border-0 shadow-2xl bg-background/50 backdrop-blur-sm">
            <CardHeader className="border-b bg-muted/20 px-6 py-3 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className={cn("p-1.5 rounded-lg bg-gradient-to-br text-white shadow-sm", activeDashboard.gradient)}>
                  <BarChart3 className="h-4 w-4" />
                </div>
                <CardTitle className="text-lg font-bold font-display">{activeDashboard.title}</CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDashboard(null)}
                className="h-8 px-3 bg-background/50 hover:bg-primary/10 transition-colors border-primary/20"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Voltar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {activeDashboard.id === "financeiro" ? (
                <div className="p-6"><BIFinanceiro /></div>
              ) : activeDashboard.id === "comercial" ? (
                <div className="p-6"><BIComercial /></div>
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
