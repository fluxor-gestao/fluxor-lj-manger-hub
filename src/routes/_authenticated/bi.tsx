import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, BriefcaseBusiness, DollarSign, ShieldAlert, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessBiDashboard } from "@/lib/access";

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

  // Se o usuário só tem acesso a 1 dashboard, abrir direto
  useEffect(() => {
    if (!roleLoading && visibleDashboards.length === 1 && !selectedDashboard) {
      setSelectedDashboard(visibleDashboards[0].id);
    }
  }, [roleLoading, visibleDashboards, selectedDashboard]);

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
          <h1 className="text-3xl font-bold font-display">Dashboards Gerenciais</h1>
          <p className="text-muted-foreground mt-1">Indicadores consolidados e integração com ferramentas de BI</p>
        </div>
        <Button variant="outline" onClick={() => window.history.back()} className="sm:self-start">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      {visibleDashboards.length > 1 && (
        <div className="grid gap-4 md:grid-cols-3">
          {visibleDashboards.map((dashboard) => {
            const Icon = dashboard.icon;
            const isActive = selectedDashboard === dashboard.id;

            return (
              <Card
                key={dashboard.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDashboard(dashboard.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDashboard(dashboard.id);
                  }
                }}
                className={`group min-h-[150px] cursor-pointer border-0 bg-gradient-to-br ${dashboard.gradient} p-6 text-primary-foreground shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
                  isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                }`}
              >
                <CardHeader className="flex h-full justify-between space-y-0 p-0">
                  <Icon className="h-11 w-11 text-primary-foreground/95" strokeWidth={1.75} />
                  <CardTitle className="text-xl leading-tight text-primary-foreground">{dashboard.title}</CardTitle>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {activeDashboard && (
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">{activeDashboard.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {activeDashboard.embedUrl ? (
              <iframe
                title={activeDashboard.title}
                src={activeDashboard.embedUrl}
                className="h-[75vh] w-full border-0"
                allowFullScreen
              />
            ) : (
              <div className="flex min-h-[420px] items-center justify-center bg-background p-6">
                <div className="text-center">
                  <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">BI selecionado</p>
                  <p className="mt-1 text-sm text-muted-foreground">{activeDashboard.title} será exibido aqui.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/bi")({
  component: BI,
});
