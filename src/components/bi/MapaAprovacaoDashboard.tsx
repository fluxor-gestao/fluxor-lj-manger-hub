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
  Search,
  Target,
  Activity
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
  enviado: "#0EA5E9",
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
    address: string | null;
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
    city: "",
    country: "all"
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
          client:clients(id, name, city, country, address, latitude, longitude, company),
          areas:devis_service_areas(area_slug)
        `);

      if (filters.status !== "all") {
        query = query.eq("status", filters.status as any);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data as any[] || []).map(d => ({
        ...d,
        client: d.client || { name: "Cliente não identificado" }
      })) as DevisData[];
    }
  });

  // Geocoding logic
  useEffect(() => {
    const clientsToGeocode = devisList
      .filter(d => d.client?.city && (d.client?.country || d.client?.address) && d.client.latitude === null)
      .map(d => d.client);
    
    // De-duplicate clients
    const uniqueClients = Array.from(new Map(clientsToGeocode.map(c => [c.id, c])).values());
    
    if (uniqueClients.length > 0) {
      const processGeocoding = async () => {
        for (const client of uniqueClients.slice(0, 10)) {
          const query = `${client.city}${client.country ? `, ${client.country}` : ''}`;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
              headers: { 'User-Agent': 'Lovable-BI-Map/1.0' }
            });
            const geoData = await res.json();
            if (geoData && geoData.length > 0) {
              const lat = parseFloat(geoData[0].lat);
              const lon = parseFloat(geoData[0].lon);
              await supabase
                .from("clients")
                .update({ latitude: lat, longitude: lon } as any)
                .eq("id", client.id);
            }
          } catch (e) { 
            console.error("Geocoding failed for", client.name, e); 
          }
          // Nominatim usage policy: 1 request per second
          await new Promise(resolve => setTimeout(resolve, 1050));
        }
      };
      processGeocoding();
    }
  }, [devisList]);

  const filteredDevis = useMemo(() => {
    return devisList.filter(d => {
      if (filters.city && !d.client.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.country !== "all" && d.client.country !== filters.country) return false;
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
      { label: "Clientes Mapeados", value: new Set(filteredDevis.map(d => d.client.id)).size, icon: Users, color: "text-blue-400" },
      { label: "Devis Enviados", value: total, icon: FileText, color: "text-indigo-400" },
      { label: "Devis Aceitos", value: aceitos, icon: CheckCircle2, color: "text-emerald-400" },
      { label: "Taxa Conversão", value: PCT(taxa), icon: TrendingUp, color: "text-violet-400" },
      { label: "Total Aceito", value: BRL(valorAceito), icon: DollarSign, color: "text-amber-400" },
      { label: "Ticket Médio", value: BRL(ticketMedio), icon: Target, color: "text-rose-400" },
    ];
  }, [filteredDevis]);

  const regionsStats = useMemo(() => {
    const map = new Map<string, { total: number; aceitos: number; valor: number }>();
    filteredDevis.forEach(d => {
      const region = d.client.city || "Indefinido";
      if (!map.has(region)) map.set(region, { total: 0, aceitos: 0, valor: 0 });
      const stats = map.get(region)!;
      stats.total++;
      if (["aceita", "aprovado", "convertido"].includes(d.status)) {
        stats.aceitos++;
        stats.valor += (d.total_amount || 0);
      }
    });
    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        conversao: stats.total > 0 ? stats.aceitos / stats.total : 0
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [filteredDevis]);

  const getConversionColor = (rate: number) => {
    if (rate >= 0.4) return "#10B981";
    if (rate >= 0.25) return "#F59E0B";
    if (rate >= 0.1) return "#F97316";
    return "#EF4444";
  };

  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center bg-[#08111f] rounded-2xl border border-white/5">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="bg-white/5 border-white/10 backdrop-blur-xl relative overflow-hidden group">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between mb-1">
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              </div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-base font-black text-white mt-0.5">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-[#111827]/80 border-white/10 p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white/90 font-bold text-sm">
                <Filter className="h-4 w-4 text-blue-400" />
                Filtros
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase text-white/40 font-bold tracking-widest">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2233] border-white/10 text-white">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="aceita">Aceitos</SelectItem>
                      <SelectItem value="enviada_ao_cliente">Enviados</SelectItem>
                      <SelectItem value="rejeitada">Recusados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase text-white/40 font-bold tracking-widest">Cidade</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/20" />
                    <Input 
                      placeholder="Buscar cidade..." 
                      value={filters.city}
                      onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white pl-9 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn("h-8 text-[10px] transition-all", viewMode === 'markers' ? "bg-blue-500/20 border-blue-500/30 text-blue-400" : "bg-white/5")}
                    onClick={() => setViewMode('markers')}
                  >
                    Marcadores Individuais
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn("h-8 text-[10px] transition-all", viewMode === 'regions' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/5")}
                    onClick={() => setViewMode('regions')}
                  >
                    Análise por Região
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-[#111827]/80 border-white/10 p-4">
            <div className="flex items-center gap-2 text-white/90 font-bold text-sm mb-4">
              <Activity className="h-4 w-4 text-emerald-400" />
              Top Cidades
            </div>
            <div className="space-y-4">
              {regionsStats.slice(0, 5).map((reg, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">{reg.name}</span>
                    <span className="text-emerald-400 font-bold">{BRL(reg.valor)}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(reg.valor / regionsStats[0].valor) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3 min-h-[600px] relative rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <MapContainer center={[38.7223, -9.1393]} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            
            {viewMode === 'markers' && filteredDevis.map((d) => {
              if (!d.client.latitude) return null;
              const color = STATUS_COLORS[d.status] || "#64748B";
              return (
                <Marker 
                  key={d.id} 
                  position={[d.client.latitude, d.client.longitude!]} 
                  eventHandlers={{ click: () => setSelectedClient(d) }}
                  icon={L.divIcon({
                    className: 'custom-icon',
                    html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}"></div>`,
                    iconSize: [10, 10],
                    iconAnchor: [5, 5]
                  })}
                />
              );
            })}

            {viewMode === 'regions' && regionsStats.map((reg, idx) => {
              const first = filteredDevis.find(d => d.client.city === reg.name && d.client.latitude);
              if (!first || !first.client.latitude) return null;
              
              // Find top areas for this region
              const regionAreas = new Map<string, number>();
              filteredDevis.filter(d => d.client.city === reg.name).forEach(d => {
                d.areas.forEach(a => regionAreas.set(a.area_slug, (regionAreas.get(a.area_slug) || 0) + 1));
              });
              const topAreas = Array.from(regionAreas.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);

              return (
                <CircleMarker
                  key={idx}
                  center={[first.client.latitude, first.client.longitude!]}
                  radius={12 + reg.total * 2}
                  pathOptions={{ fillColor: getConversionColor(reg.conversao), fillOpacity: 0.6, color: 'white', weight: 1 }}
                >
                  <Popup>
                    <div className="p-1 min-w-[150px]">
                      <p className="font-bold text-sm border-b border-black/5 pb-1 mb-1">{reg.name}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Total</p>
                        <p className="text-[10px] text-right font-black">{BRL(reg.valor)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Conv.</p>
                        <p className="text-[10px] text-right font-black">{PCT(reg.conversao)}</p>
                      </div>
                      {topAreas.length > 0 && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-black/5">
                          <p className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter">Áreas Principais</p>
                          {topAreas.map(([slug, count], i) => (
                            <div key={i} className="flex justify-between items-center text-[10px]">
                              <span className="truncate max-w-[100px]">{findArea(first.business_unit as any, slug)?.label || slug}</span>
                              <span className="font-bold ml-2">{count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {selectedClient && (
            <div className="absolute right-4 top-4 bottom-4 w-72 z-[1000] animate-in slide-in-from-right duration-500">
              <Card className="h-full bg-[#111827]/95 border-white/20 backdrop-blur-2xl shadow-2xl p-5 flex flex-col">
                <div className="flex justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white">{selectedClient.client.name}</h3>
                    <p className="text-xs text-white/40">{selectedClient.client.city}, {selectedClient.client.country}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/40" onClick={() => setSelectedClient(null)}>✕</Button>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-white/40 uppercase font-bold">Valor</p>
                      <p className="text-xs font-black text-white">{BRL(selectedClient.total_amount || 0)}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-white/40 uppercase font-bold">Status</p>
                      <p className="text-xs font-black" style={{ color: STATUS_COLORS[selectedClient.status] }}>{STATUS_LABELS[selectedClient.status] || selectedClient.status}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/40">Responsável</span>
                      <span className="text-white/80">{selectedClient.commercial_responsible || '—'}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/40">Data</span>
                      <span className="text-white/80">{new Date(selectedClient.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] uppercase text-white/40 font-bold">Áreas</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedClient.areas.map((a, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] h-4 px-1.5 bg-white/5 border-white/10 text-white/70">
                          {findArea(selectedClient.business_unit as any, a.area_slug)?.label || a.area_slug}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 mt-6 group"
                  onClick={() => navigate({ to: `/comercial/devis/${selectedClient.id}` })}
                >
                  Ver Devis
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
