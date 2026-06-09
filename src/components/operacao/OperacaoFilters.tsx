import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { STATUS_LABEL, STATUS_ORDER } from "./status";

export type OperacaoFilterState = {
  search: string;
  status: string;
  responsavel: string;
  bu: string;
  startFrom: string;
  startTo: string;
  dueFrom: string;
  dueTo: string;
  onlyOverdue: boolean;
};

export const initialFilters: OperacaoFilterState = {
  search: "",
  status: "all",
  responsavel: "all",
  bu: "all",
  startFrom: "",
  startTo: "",
  dueFrom: "",
  dueTo: "",
  onlyOverdue: false,
};

export function OperacaoFilters({
  value,
  onChange,
  responsibles,
  businessUnits,
  areas = [],
}: {
  value: OperacaoFilterState;
  onChange: (v: OperacaoFilterState) => void;
  responsibles: { id: string; name: string }[];
  businessUnits: string[];
  areas?: string[];
}) {
  const set = <K extends keyof OperacaoFilterState>(k: K, v: OperacaoFilterState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px_180px]">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Busca</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Título, cliente, descrição…"
                value={value.search}
                onChange={(e) => set("search", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={value.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Responsável</Label>
            <Select value={value.responsavel} onValueChange={(v) => set("responsavel", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="none">Sem responsável</SelectItem>
                {responsibles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Unidade de negócio</Label>
            <Select value={value.bu} onValueChange={(v) => set("bu", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {businessUnits.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Área principal</Label>
            <Select value={value.area} onValueChange={(v) => set("area", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Início de</Label>
            <Input type="date" value={value.startFrom} onChange={(e) => set("startFrom", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Início até</Label>
            <Input type="date" value={value.startTo} onChange={(e) => set("startTo", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Previsão de</Label>
            <Input type="date" value={value.dueFrom} onChange={(e) => set("dueFrom", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Previsão até</Label>
            <Input type="date" value={value.dueTo} onChange={(e) => set("dueTo", e.target.value)} />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Switch
              id="only-overdue"
              checked={value.onlyOverdue}
              onCheckedChange={(v) => set("onlyOverdue", v)}
            />
            <Label htmlFor="only-overdue" className="text-xs">Apenas atrasados</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function applyFilters(rows: any[], f: OperacaoFilterState): any[] {
  const today = new Date().toISOString().slice(0, 10);
  const s = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.responsavel === "none" && r.assigned_to) return false;
    if (f.responsavel !== "all" && f.responsavel !== "none" && r.assigned_to !== f.responsavel) return false;
    if (f.bu !== "all" && r.business_unit !== f.bu) return false;
    if (f.area !== "all" && r.responsible_sector !== f.area) return false;
    if (f.startFrom && (!r.start_date || r.start_date < f.startFrom)) return false;
    if (f.startTo && (!r.start_date || r.start_date > f.startTo)) return false;
    if (f.dueFrom && (!r.expected_end_date || r.expected_end_date < f.dueFrom)) return false;
    if (f.dueTo && (!r.expected_end_date || r.expected_end_date > f.dueTo)) return false;
    if (f.onlyOverdue) {
      const overdue = r.expected_end_date && r.expected_end_date < today
        && r.status !== "concluido" && r.status !== "cancelado";
      if (!overdue) return false;
    }
    if (s) {
      const hay = `${r.title ?? ""} ${r.description ?? ""} ${r.client?.name ?? ""} ${r.business_unit ?? ""}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });
}
