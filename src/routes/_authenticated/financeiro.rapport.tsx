import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/financeiro/rapport")({
  component: RapportPage,
});

function RapportPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/financeiro" })}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display">Rapport</h1>
          <p className="text-sm text-muted-foreground">Relatórios e indicadores financeiros</p>
        </div>
      </div>
      <Card>
        <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BarChart3 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Em breve</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Os relatórios financeiros (DRE, fluxo de caixa, análises) estão em construção e
            ficarão disponíveis aqui em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
