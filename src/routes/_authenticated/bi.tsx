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
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {selectedDashboard && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedDashboard(null)}
              className="h-8 px-2 bg-background/50 hover:bg-primary/5 border-primary/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
          <div>
            <h1 className={cn(
              "font-bold font-display tracking-tight transition-all duration-300",
              selectedDashboard ? "text-xl" : "text-3xl"
            )}>
              {selectedDashboard ? activeDashboard?.title : "Business Intelligence"}
            </h1>
            {!selectedDashboard && (
              <p className="text-muted-foreground text-sm mt-1">
                Selecione um painel para visualizar os indicadores estratégicos.
              </p>
            )}
          </div>
        </div>
        {!selectedDashboard && (
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="opacity-70 hover:opacity-100">
            Sair
          </Button>
        )}
      </div>

      <div 
        className={cn(
          "grid gap-3 transition-all duration-300 ease-in-out",
          selectedDashboard 
            ? "grid-cols-3 md:grid-cols-3 mb-2" 
            : "grid-cols-1 md:grid-cols-3 py-6"
        )}
      >
        {visibleDashboards.map((dashboard) => {
          const Icon = dashboard.icon;
          const isActive = selectedDashboard === dashboard.id;

          
          const getDesc = (id: string) => {
            if (id === "comercial") return "Acompanhe propostas, vendas e performance comercial.";
            if (id === "financeiro") return "Controle receitas, despesas, resultados e fluxo financeiro.";
            if (id === "operacao") return "Acompanhe processos, produtividade e execução operacional.";
            return "Visualize indicadores e métricas estratégicas.";
          };

          return (
            <Card
              key={dashboard.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedDashboard(dashboard.id)}
              className={cn(
                "group relative overflow-hidden cursor-pointer border-0 transition-all duration-500 ease-out",
                isActive 
                  ? "ring-2 ring-primary ring-offset-4 ring-offset-background z-20 shadow-2xl" 
                  : "shadow-lg hover:shadow-2xl hover:-translate-y-2",
                selectedDashboard 
                  ? "min-h-[70px] p-3" 
                  : "min-h-[320px] p-10 flex flex-col justify-between"
              )}
            >
              {/* Premium Gradient Background */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br transition-all duration-500",
                dashboard.gradient,
                selectedDashboard ? "opacity-90" : "opacity-100"
              )} />
              
              {/* Glass/Glow Effects */}
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-150" />

              <div className={cn(
                "relative z-10 flex h-full transition-all duration-500",
                selectedDashboard ? "flex-row items-center gap-4" : "flex-col items-start"
              )}>
                <div className={cn(
                  "rounded-2xl bg-white/20 backdrop-blur-xl border border-white/20 shadow-xl transition-all duration-500 group-hover:rotate-3 group-hover:scale-110",
                  selectedDashboard ? "p-2" : "p-6"
                )}>
                  <Icon 
                    className={cn(
                      "text-white drop-shadow-2xl",
                      selectedDashboard ? "h-6 w-6" : "h-14 w-14"
                    )} 
                    strokeWidth={1.5} 
                  />
                </div>
                
                <div className={cn(
                  "transition-all duration-500",
                  selectedDashboard ? "flex-1" : "mt-8 w-full"
                )}>
                  <h3 className={cn(
                    "font-display font-black text-white tracking-tight drop-shadow-sm",
                    selectedDashboard ? "text-base" : "text-3xl"
                  )}>
                    {dashboard.title.replace("Dashboard ", "")}
                  </h3>
                  
                  {!selectedDashboard && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150">
                      <p className="text-white/90 text-lg mt-3 leading-relaxed font-medium max-w-[280px]">
                        {getDesc(dashboard.id)}
                      </p>
                      
                      <Button 
                        variant="secondary" 
                        className="mt-10 bg-white/95 text-foreground hover:bg-white hover:scale-105 transition-all shadow-xl border-0 font-bold group/btn"
                      >
                        Abrir Dashboard
                        <ArrowLeft className="ml-2 h-4 w-4 rotate-180 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Decorative Border Glow */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
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
