import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
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
  ChevronRight, 
  MapPin, 
  Maximize2, 
  LayoutDashboard,
  ArrowRight,
  Search,
  Loader2,
  AlertCircle
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
import { toast } from "sonner";

// Fix for default marker icons in Leaflet with React
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
  ativo: "#10B981", // Verde
  enviada_ao_cliente: "#0EA5E9", // Azul
  aguardando_aceite: "#F59E0B", // Amarelo
  aceita: "#8B5CF6", // Roxo
  rejeitada: "#EF4444", // Vermelho
  // Mapeamentos adicionais
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
  const [viewMode, setViewMode] = useState<"markers" | "heatmap" | "regions">("markers");
  const [selectedClient, setSelectedClient] = useState<DevisData | null>(null);
  const [filters, setFilters] = useState({
    period: "365",
    responsible: "all",
    area: "all",
    status: "all",
    country: "all",
    city: ""
  });

  // Fetch data
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
        `)
        .order("created_at", { ascending: false });

      if (filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.responsible !== "all") query = query.eq("commercial_responsible", filters.responsible);
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by period client-side for simplicity if needed, or update query
      return (data as any[] || []).map(d => ({
        ...d,
        client: d.client || { name: "Cliente não identificado" }
      })) as DevisData[];
    }
  });

  // Geocoding logic
  useEffect(() => {
    const clientsToGeocode = devisList
      .filter(d => d.client?.city && d.client?.country && d.client.latitude === null)
      .map(d => d.client);
    
    // Only geocode if we have missing data
    if (clientsToGeocode.length > 0) {
      const processGeocoding = async () => {
        // Process a few at a time to avoid rate limits
        for (const client of clientsToGeocode.slice(0, 5)) {
          const query = `${client.city}, ${client.country}`;
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
                .update({ latitude: lat, longitude: lon })
                .eq("id", client.id);
            }
          } catch (e) {
            console.error("Geocoding error for", client.name, e);
          }
          // Small delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      };
      processGeocoding();
    }
  }, [devisList]);

  // Derived data
  const filteredDevis = useMemo(() => {
    return devisList.filter(d => {
      if (filters.area !== "all") {
        const hasArea = d.areas.some(a => a.area_slug === filters.area) || d.responsible_sector === filters.area;
        if (!hasArea) return false;
      }
      if (filters.city && !d.client.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.country !== "all" && d.client.country !== filters.country) return false;
      return true;
    });
  }, [devisList, filters]);

  const kpis = useMemo(() => {
    const total = filteredDevis.length;
    const aceitos = filteredDevis.filter(d => ["aceita", "aprovado", "convertido"].includes(d.status)).length;
    const valorTotal = filteredDevis.reduce((acc, d) => acc + (d.total_amount || 0), 0);
    const valorAceito = filteredDevis.filter(d => ["aceita", "aprovado", "convertido"].includes(d.status)).reduce((acc, d) => acc + (d.total_amount || 0), 0);
    const taxa = total > 0 ? aceitos / total : 0;
    const ticketMedio = aceitos > 0 ? valorAceito / aceitos : 0;

    return [
      { label: "Clientes Mapeados", value: new Set(filteredDevis.map(d => d.client.id)).size, icon: Users, color: "text-blue-400" },
      { label: "Devis Enviados", value: total, icon: FileText, color: "text-indigo-400" },
      { label: "Devis Aceitos", value: aceitos, icon: CheckCircle2, color: "text-emerald-400" },
      { label: "Taxa de Conversão", value: PCT(taxa), icon: TrendingUp, color: "text-violet-400" },
      { label: "Total Aceito", value: BRL(valorAceito), icon: DollarSign, color: "text-amber-400" },
      { label: "Ticket Médio", value: BRL(ticketMedio), icon: Target, color: "text-rose-400" },
    ];
  }, [filteredDevis]);

  const regions = useMemo(() => {
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
    if (rate >= 0.4) return "#10B981"; // Verde
    if (rate >= 0.25) return "#F59E0B"; // Amarelo
    if (rate >= 0.1) return "#F97316"; // Laranja
    return "#EF4444"; // Vermelho
  };

  if (isLoading) {
    return (
      <div className=\"flex h-[600px] items-center justify-center bg-[#08111f] rounded-2xl border border-white/5\">
        <div className=\"text-center space-y-4\">
          <Loader2 className=\"h-12 w-12 text-blue-500 animate-spin mx-auto\" />
          <p className=\"text-white/40\">Carregando dados geográficos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className=\"space-y-6 animate-in fade-in duration-700\">
      {/* KPIs */}
      <div className=\"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4\">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className=\"bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden relative group hover:border-white/20 transition-all\">
            <div className=\"absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none\" />
            <CardContent className=\"p-4 relative z-10\">
              <div className=\"flex items-center justify-between mb-2\">
                <div className={cn(\"p-2 rounded-lg bg-white/5\", kpi.color)}>
                  <kpi.icon className=\"h-4 w-4\" />
                </div>
              </div>
              <div>
                <p className=\"text-[10px] font-bold text-white/40 uppercase tracking-wider\">{kpi.label}</p>
                <p className=\"text-lg font-black text-white mt-0.5\">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className=\"grid grid-cols-1 lg:grid-cols-4 gap-6\">
        {/* Sidebar Filters & Ranking */}
        <div className=\"lg:col-span-1 space-y-6\">
          <Card className=\"bg-[#111827]/80 border-white/10 backdrop-blur-xl\">
            <CardContent className=\"p-4 space-y-4\">
              <div className=\"flex items-center gap-2 text-white/90 font-bold text-sm border-b border-white/5 pb-2\">
                <Filter className=\"h-4 w-4\" />
                Filtros Inteligentes
              </div>
              
              <div className=\"space-y-3\">
                <div className=\"space-y-1.5\">
                  <Label className=\"text-[10px] uppercase text-white/40 font-bold tracking-widest\">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                    <SelectTrigger className=\"bg-white/5 border-white/10 text-white h-9\">
                      <SelectValue placeholder=\"Todos os Status\" />
                    </SelectTrigger>
                    <SelectContent className=\"bg-[#1a2233] border-white/10 text-white\">
                      <SelectItem value=\"all\">Todos</SelectItem>
                      <SelectItem value=\"aceita\">Aceitos</SelectItem>
                      <SelectItem value=\"enviada_ao_cliente\">Enviados</SelectItem>
                      <SelectItem value=\"rejeitada\">Recusados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className=\"space-y-1.5\">
                  <Label className=\"text-[10px] uppercase text-white/40 font-bold tracking-widest\">Cidade</Label>
                  <div className=\"relative\">
                    <Search className=\"absolute left-2.5 top-2.5 h-4 w-4 text-white/20\" />
                    <Input 
                      placeholder=\"Buscar cidade...\" 
                      value={filters.city}
                      onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                      className=\"bg-white/5 border-white/10 text-white pl-9 h-9\"
                    />
                  </div>
                </div>

                <div className=\"flex gap-2 pt-2\">
                  <Button 
                    variant=\"outline\" 
                    size=\"sm\" 
                    className={cn(\"flex-1 h-8 text-[10px]\", viewMode === 'markers' ? \"bg-blue-500/20 text-blue-400 border-blue-500/30\" : \"bg-white/5 text-white/40\")}
                    onClick={() => setViewMode('markers')}
                  >
                    Marcadores
                  </Button>
                  <Button 
                    variant=\"outline\" 
                    size=\"sm\" 
                    className={cn(\"flex-1 h-8 text-[10px]\", viewMode === 'regions' ? \"bg-emerald-500/20 text-emerald-400 border-emerald-500/30\" : \"bg-white/5 text-white/40\")}
                    onClick={() => setViewMode('regions')}
                  >
                    Regiões
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className=\"bg-[#111827]/80 border-white/10 backdrop-blur-xl\">
            <CardContent className=\"p-4\">
              <div className=\"flex items-center gap-2 text-white/90 font-bold text-sm border-b border-white/5 pb-2 mb-4\">
                <TrendingUp className=\"h-4 w-4\" />
                Ranking por Cidade
              </div>
              <div className=\"space-y-3\">
                {regions.slice(0, 5).map((reg, idx) => (
                  <div key={idx} className=\"group cursor-pointer\">
                    <div className=\"flex items-center justify-between mb-1\">
                      <span className=\"text-xs font-medium text-white/80\">{reg.name}</span>
                      <span className=\"text-[10px] font-bold text-emerald-400\">{BRL(reg.valor)}</span>
                    </div>
                    <div className=\"h-1.5 w-full bg-white/5 rounded-full overflow-hidden\">
                      <div 
                        className=\"h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000\" 
                        style={{ width: `${Math.min(100, (reg.valor / regions[0].valor) * 100)}%` }}
                      />
                    </div>
                    <div className=\"flex items-center justify-between mt-1\">
                      <span className=\"text-[10px] text-white/40\">{reg.total} propostas</span>
                      <span className=\"text-[10px] text-white/40\">{PCT(reg.conversao)} conv.</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map Area */}
        <div className=\"lg:col-span-3 min-h-[600px] relative\">
          <Card className=\"h-full bg-[#111827]/80 border-white/10 overflow-hidden shadow-2xl\">
            <MapContainer 
              center={[38.7223, -9.1393]} 
              zoom={6} 
              style={{ height: '100%', width: '100%' }}
              className=\"z-0\"
            >
              <TileLayer
                url=\"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png\"
                attribution='&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>'
              />
              
              {viewMode === 'markers' && filteredDevis.map((devis) => {
                if (!devis.client.latitude || !devis.client.longitude) return null;
                
                const color = STATUS_COLORS[devis.status] || \"#64748B\";
                
                return (
                  <Marker 
                    key={devis.id} 
                    position={[devis.client.latitude, devis.client.longitude]}
                    eventHandlers={{
                      click: () => setSelectedClient(devis)
                    }}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div style=\"background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}\"></div>`,
                      iconSize: [12, 12],
                      iconAnchor: [6, 6]
                    })}
                  >
                    <Popup className=\"custom-popup\">
                      <div className=\"p-2 min-w-[200px]\">
                        <h4 className=\"font-bold text-sm mb-1\">{devis.client.name}</h4>
                        <p className=\"text-xs text-muted-foreground\">Devis: {devis.devis_number || 'N/A'}</p>
                        <div className=\"mt-2 pt-2 border-t flex items-center justify-between\">
                          <span className=\"text-xs font-bold\">{BRL(devis.total_amount || 0)}</span>
                          <Badge variant=\"secondary\" style={{ backgroundColor: color + '20', color: color }}>
                            {STATUS_LABELS[devis.status] || devis.status}
                          </Badge>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {viewMode === 'regions' && regions.map((reg, idx) => {
                const devisWithCoords = filteredDevis.find(d => d.client.city === reg.name && d.client.latitude);
                if (!devisWithCoords || !devisWithCoords.client.latitude) return null;
                
                return (
                  <CircleMarker
                    key={idx}
                    center={[devisWithCoords.client.latitude, devisWithCoords.client.longitude]}
                    radius={Math.min(40, 10 + reg.total * 2)}
                    pathOptions={{
                      fillColor: getConversionColor(reg.conversao),
                      fillOpacity: 0.6,
                      color: 'white',
                      weight: 1
                    }}
                  >
                    <Popup>
                      <div className=\"p-2\">
                        <h4 className=\"font-bold\">{reg.name}</h4>
                        <div className=\"grid grid-cols-2 gap-2 mt-2\">
                          <div>
                            <p className=\"text-[10px] uppercase text-muted-foreground\">Propostas</p>
                            <p className=\"text-sm font-bold\">{reg.total}</p>
                          </div>
                          <div>
                            <p className=\"text-[10px] uppercase text-muted-foreground\">Conversão</p>
                            <p className=\"text-sm font-bold\">{PCT(reg.conversao)}</p>
                          </div>
                          <div className=\"col-span-2\">
                            <p className=\"text-[10px] uppercase text-muted-foreground\">Valor Total</p>
                            <p className=\"text-sm font-bold text-emerald-600\">{BRL(reg.valor)}</p>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* Float Overlay for Selected Client */}
            {selectedClient && (
              <div className=\"absolute right-4 top-4 bottom-4 w-72 z-10 animate-in slide-in-from-right duration-500\">
                <Card className=\"h-full bg-[#111827]/95 border-white/20 backdrop-blur-2xl shadow-2xl flex flex-col\">
                  <CardContent className=\"p-5 flex-1 overflow-y-auto space-y-6\">
                    <div className=\"flex justify-between items-start\">
                      <div className=\"space-y-1\">
                        <h3 className=\"text-lg font-black text-white leading-tight\">{selectedClient.client.name}</h3>
                        <p className=\"text-xs text-white/40\">{selectedClient.client.city}, {selectedClient.client.country}</p>
                      </div>
                      <Button 
                        variant=\"ghost\" 
                        size=\"icon\" 
                        className=\"text-white/40 hover:text-white\"
                        onClick={() => setSelectedClient(null)}
                      >
                        <AlertCircle className=\"h-4 w-4 rotate-45\" />
                      </Button>
                    </div>

                    <div className=\"grid grid-cols-2 gap-4\">
                      <div className=\"p-3 rounded-xl bg-white/5 border border-white/5\">
                        <p className=\"text-[10px] uppercase text-white/40 font-bold mb-1\">Valor</p>
                        <p className=\"text-sm font-black text-white\">{BRL(selectedClient.total_amount || 0)}</p>
                      </div>
                      <div className=\"p-3 rounded-xl bg-white/5 border border-white/5\">
                        <p className=\"text-[10px] uppercase text-white/40 font-bold mb-1\">Status</p>
                        <Badge 
                          className=\"text-[10px] h-5\" 
                          style={{ backgroundColor: (STATUS_COLORS[selectedClient.status] || '#64748B') + '20', color: STATUS_COLORS[selectedClient.status] }}
                        >
                          {STATUS_LABELS[selectedClient.status] || selectedClient.status}
                        </Badge>
                      </div>
                    </div>

                    <div className=\"space-y-3\">
                      <div className=\"flex items-center justify-between text-xs\">
                        <span className=\"text-white/40\">Número Devis</span>
                        <span className=\"text-white/80 font-medium\">{selectedClient.devis_number || '—'}</span>
                      </div>
                      <div className=\"flex items-center justify-between text-xs\">
                        <span className=\"text-white/40\">Responsável</span>
                        <span className=\"text-white/80 font-medium\">{selectedClient.commercial_responsible || '—'}</span>
                      </div>
                      <div className=\"flex items-center justify-between text-xs\">
                        <span className=\"text-white/40\">Data Proposta</span>
                        <span className=\"text-white/80 font-medium\">{new Date(selectedClient.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className=\"space-y-2\">
                      <p className=\"text-[10px] uppercase text-white/40 font-bold tracking-widest\">Áreas Contratadas</p>
                      <div className=\"flex flex-wrap gap-1.5\">
                        {selectedClient.areas.length > 0 ? selectedClient.areas.map((a, i) => {
                          const area = findArea(selectedClient.business_unit as CompanyCode, a.area_slug);
                          return (
                            <Badge key={i} variant=\"outline\" className=\"bg-white/5 border-white/10 text-[10px] text-white/70\">
                              {area?.label || a.area_slug}
                            </Badge>
                          );
                        }) : (
                          <Badge variant=\"outline\" className=\"bg-white/5 border-white/10 text-[10px] text-white/70\">
                            {findArea(selectedClient.business_unit as CompanyCode, selectedClient.responsible_sector)?.label || selectedClient.responsible_sector || '—'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button 
                      className=\"w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-blue-900/20 group mt-auto\"
                      onClick={() => navigate({ to: `/comercial/devis/${selectedClient.id}` })}
                    >
                      Ver Devis
                      <ArrowRight className=\"ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform\" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
