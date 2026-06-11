import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MapaAprovacaoDashboard from "@/components/bi/MapaAprovacaoDashboard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/comercial/mapa-aprovacao")({
  component: MapaAprovacao,
});

function MapaAprovacao() {
  const navigate = useNavigate();
  return (
    <div className={cn(
      "min-h-[calc(100vh-4rem)] transition-all duration-700 rounded-xl overflow-hidden relative p-6 lg:p-8 space-y-8",
      "bg-[#F8FAFC]"
    )}>
      <div className="relative z-10 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 font-display tracking-tight">Mapa de Aprovação</h1>
            <p className="text-slate-500 text-sm font-medium">Inteligência comercial geográfica e análise de conversão territorial</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate({ to: "/comercial" })}
            className="h-9 px-4 bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm transition-all rounded-lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Comercial
          </Button>
        </div>
        
        <MapaAprovacaoDashboard />
      </div>
    </div>
  );
}