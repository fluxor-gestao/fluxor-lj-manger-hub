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
      "bg-[#08111f]"
    )} style={{
      background: "linear-gradient(180deg, #08111f 0%, #0b1526 40%, #101827 100%)"
    }}>
      {/* Visual Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.05),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white font-display tracking-tight">Mapa de Aprovação</h1>
            <p className="text-white/50 text-sm">Inteligência comercial geográfica e análise de conversão territorial</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate({ to: "/comercial" })}
            className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all rounded-full backdrop-blur-md"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Comercial
          </Button>
        </div>
        
        <MapaAprovacaoDashboard />
      </div>
    </div>
  );
}