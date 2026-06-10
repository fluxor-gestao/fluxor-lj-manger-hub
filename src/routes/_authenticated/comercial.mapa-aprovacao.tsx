import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { EmptyState } from "@/components/DataStates";

export const Route = createFileRoute("/_authenticated/comercial/mapa-aprovacao")({
  component: MapaAprovacao,
});

function MapaAprovacao() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display">Mapa de Aprovação</h1>
          <p className="text-muted-foreground mt-1">Fluxo de aprovações comerciais</p>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/comercial" })}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
      
      <EmptyState 
        title="Mapa de Aprovação em breve" 
        description="Este módulo está sendo planejado e estará disponível em breve." 
      />
    </div>
  );
}
