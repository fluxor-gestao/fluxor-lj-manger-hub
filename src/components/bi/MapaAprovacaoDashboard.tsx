import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  Users, 
  FileText, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  Filter, 
  MapPin, 
  ArrowRight,
  Loader2,
  AlertCircle,
  Search
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "@tanstack/react-router";
import { findArea } from "@/lib/businessAreas";
import { CompanyCode } from "@/lib/companyCodes";

// Fix for default marker icons in Leaflet
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const BRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const PCT = (n: number) => `${((n || 0) * 100).toFixed(1)}%`;

const STATUS_COLORS: Record<string, string> = {
  ativo: "#10B981",
  enviada_ao_cliente: "#0EA5E9",
  aguardando_aceite: "#F59E0B",
  aceita: "#8B5CF6",
  rejeitada: "#EF4444",
  rascunho: "#64748B",
  em_negociacao: "#F59E0B",
  aprovado: "#8B5CF6",
  convertido: "#8B5CF6",
  rejeitado: "#EF4444",
};

const STATUS_LABELS: Record<string, string> = {
  ativo: "Cliente Ativo",
  enviada_ao_cliente: "Proposta Enviada",
  aguardando_aceite: "Em Negociação",
  aceita: "Proposta Aceita",
  rejeitada: "Proposta Perdida",
};

type DevisData = {
  id: string;
  devis_number: string | null;
  status: string;
  total_amount: number | null;
  accepted_at: string | null;
  commercial_responsible: string | null;
  business_unit: string | null;
  responsible_sector: string | null;
  created_at: string;
  client: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    company: string | null;
  };
  areas: { area_slug: string }[];
};

export default function MapaAprovacaoDashboard() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"markers" | "regions">("markers");
  const [selectedClient, setSelectedClient] = useState<DevisData | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    city: ""
  });

  const { data: devisList = [], isLoading } = useQuery({
    queryKey: ["mapa-aprovacao", filters],
    queryFn: async () => {
      let query = supabase
        .from("devis")
        .select(`
          id, 
          devis_number, 
          status, 
          total_amount, 
          accepted_at, 
          commercial_responsible, 
          business_unit, 
          responsible_sector,
          created_at,
          client:clients(id, name, city, country, latitude, longitude, company),
          areas:devis_service_areas(area_slug)
        `);

      if (filters.status !== "all") query = query.eq("status", filters.status);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data as any[] || []).map(d => ({
        ...d,
        client: d.client || { name: "Cliente não identificado" }
      })) as DevisData[];
    }
  });

  // Geocoding logic (simple client side)
  useEffect(() => {
    const clientsToGeocode = devisList
      .filter(d => d.client?.city && d.client?.country && d.client.latitude === null)
      .map(d => d.client);
    
    if (clientsToGeocode.length > 0) {
      const processGeocoding = async () => {
        for (const client of clientsToGeocode.slice(0, 5)) {
          const query = `${client.city}, ${client.country}`;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
              headers: { 'User-Agent': 'Lovable-BI-Map/1.0' }
            });
            const geoData = await res.json();
            if (geoData && geoData.length > 0) {
              await supabase
                .from("clients")
                .update({ latitude: parseFloat(geoData[0].lat), longitude: parseFloat(geoData[0].lon) })
                .eq("id", client.id);
            }
          } catch (e) { console.error(e); }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      };
      processGeocoding();
    }
  }, [devisList]);

  const filteredDevis = useMemo(() => {
    return devisList.filter(d => {
      if (filters.city && !d.client.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
      return true;
    });
  }, [devisList, filters]);

  const kpis = useMemo(() => {
    const total = filteredDevis.length;
    const aceitos = filteredDevis.filter(d => ["aceita", "aprovado", "convertido"].includes(d.status)).length;
    const valorAceito = filteredDevis.filter(d => ["aceita", "aprovado", "convertido"].includes(d.status)).reduce((acc, d) => acc + (d.total_amount || 0), 0);
    const taxa = total > 0 ? aceitos / total : 0;
    const ticketMedio = aceitos > 0 ? valorAceito / aceitos : 0;

    return [
      { label: "Clientes", value: new Set(filteredDevis.map(d => d.client.id)).size, icon: Users, color: "text-blue-400" },
      { label: "Propostas", value: total, icon: FileText, color: "text-indigo-400" },
      { label: "Aceitos", value: aceitos, icon: CheckCircle2, color: "text-emerald-400" },
      { label: "Conversão", value: PCT(taxa), icon: TrendingUp, color: "text-violet-400" },
      { label: "Valor Aceito", value: BRL(valorAceito), icon: DollarSign, color: "text-amber-400" },
    ];
  }, [filteredDevis]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="bg-[#111827] border-white/10 p-4">
            <div className="flex items-center gap-3">
              <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              <div>
                <p className="text-[10px] text-white/40 uppercase">{kpi.label}</p>
                <p className="font-bold text-white text-sm">{kpi.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-[#111827] border-white/10 p-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2233] border-white/10 text-white">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="aceita">Aceitos</SelectItem>
                    <SelectItem value="enviada_ao_cliente">Enviados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                className={cn("w-full text-xs", viewMode === 'markers' ? "bg-blue-500/20" : "")}
                onClick={() => setViewMode(viewMode === 'markers' ? 'regions' : 'markers')}
              >
                {viewMode === 'markers' ? 'Modo Regiões' : 'Modo Marcadores'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3 h-[500px] bg-[#111827] border border-white/10 rounded-lg overflow-hidden">
          <MapContainer center={[38.7223, -9.1393]} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            
            {viewMode === 'markers' && filteredDevis.map((d) => {
              if (!d.client.latitude) return null;
              return (
                <Marker key={d.id} position={[d.client.latitude, d.client.longitude!]} eventHandlers={{ click: () => setSelectedClient(d) }} />
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
