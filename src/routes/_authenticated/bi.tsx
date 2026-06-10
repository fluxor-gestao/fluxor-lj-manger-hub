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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Business Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            {selectedDashboard 
              ? `Visualizando indicadores de ${activeDashboard?.title}` 
              : "Selecione um painel para visualizar os indicadores estratégicos."}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedDashboard && (
            <Button 
              variant="outline" 
              onClick={() => setSelectedDashboard(null)}
              className="bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos Painéis
            </Button>
          )}
          <Button variant="ghost" onClick={() => window.history.back()} className="sm:self-start opacity-70 hover:opacity-100">
            Sair
          </Button>
        </div>
      </div>

      <div 
        className={cn(
          "grid gap-6 transition-all duration-500 ease-in-out",
          selectedDashboard 
            ? "grid-cols-3 md:grid-cols-3 opacity-90 scale-[0.98] -translate-y-2" 
            : "grid-cols-1 md:grid-cols-3"
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
                "group relative overflow-hidden cursor-pointer border-0 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                isActive 
                  ? "ring-2 ring-primary ring-offset-4 ring-offset-background" 
                  : "grayscale-[0.2] hover:grayscale-0",
                selectedDashboard 
                  ? "min-h-[80px] p-4" 
                  : "min-h-[220px] p-8"
              )}
            >
              {/* Decorative background gradient */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
                dashboard.gradient,
                selectedDashboard ? "opacity-90" : "opacity-100"
              )} />
              
              {/* Glassmorphism effect overlay */}
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className={cn(
                "relative z-10 flex h-full items-start justify-between",
                selectedDashboard ? "flex-row items-center gap-3" : "flex-col"
              )}>
                <div className={cn(
                  "rounded-2xl bg-white/20 p-3 backdrop-blur-md transition-all duration-300 group-hover:scale-110",
                  selectedDashboard ? "p-2" : "p-4"
                )}>
                  <Icon 
                    className={cn(
                      "text-white drop-shadow-md",
                      selectedDashboard ? "h-6 w-6" : "h-10 w-10"
                    )} 
                    strokeWidth={1.5} 
                  />
                </div>
                
                <div className={selectedDashboard ? "flex-1" : "mt-4"}>
                  <h3 className={cn(
                    "font-display font-bold text-white tracking-wide transition-all duration-300",
                    selectedDashboard ? "text-sm" : "text-2xl"
                  )}>
                    {dashboard.title.replace("Dashboard ", "")}
                  </h3>
                  {!selectedDashboard && (
                    <p className="text-white/80 text-sm mt-2 font-medium">
                      Clique para expandir indicadores
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {activeDashboard ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <Card className="overflow-hidden border-0 shadow-2xl bg-background/50 backdrop-blur-sm border-t border-primary/10">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white shadow-sm", activeDashboard.gradient)}>
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold font-display">{activeDashboard.title}</CardTitle>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5 font-semibold">Live Data Feed</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Conectado</span>
                </div>
              </div>
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
                <div className="flex min-h-[420px] items-center justify-center bg-background/50 p-12">
                  <div className="text-center max-w-md animate-in zoom-in duration-300">
                    <div className="mb-6 inline-flex p-4 rounded-full bg-muted/50">
                      <BarChart3 className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold">Painel em Desenvolvimento</h3>
                    <p className="mt-2 text-muted-foreground leading-relaxed">
                      Este dashboard está sendo configurado e em breve exibirá todos os indicadores em tempo real.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-muted-foreground/10 bg-muted/5 p-12 text-center animate-in fade-in duration-700">
          <div className="mb-4 rounded-full bg-background p-6 shadow-sm ring-1 ring-border">
            <LayoutDashboard className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-xl font-semibold text-foreground/70">Pronto para começar?</h2>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
            Selecione um dashboard acima para visualizar os indicadores e gráficos detalhados da sua operação.
          </p>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/bi")({
  component: BI,
});
