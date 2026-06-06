// Helpers e tokens compartilhados do módulo Operação.
export type OpStatus =
  | "a_iniciar"
  | "pendente"
  | "em_andamento"
  | "aguardando_cliente"
  | "aguardando_aprovacao"
  | "concluido"
  | "cancelado";

export const STATUS_ORDER: OpStatus[] = [
  "a_iniciar",
  "pendente",
  "em_andamento",
  "aguardando_cliente",
  "aguardando_aprovacao",
  "concluido",
  "cancelado",
];

export const STATUS_LABEL: Record<OpStatus, string> = {
  a_iniciar: "A iniciar",
  pendente: "Pendente",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando cliente",
  aguardando_aprovacao: "Aguardando aprovação",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const STATUS_BADGE: Record<OpStatus, string> = {
  a_iniciar: "bg-muted text-muted-foreground border-border",
  pendente: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  em_andamento: "bg-primary/10 text-primary border-primary/20",
  aguardando_cliente: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  aguardando_aprovacao: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  concluido: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
};

export const ACTIVE_STATUSES: OpStatus[] = [
  "a_iniciar",
  "pendente",
  "em_andamento",
  "aguardando_cliente",
  "aguardando_aprovacao",
];

export type ServiceLike = {
  id: string;
  title: string;
  description: string | null;
  business_unit: string | null;
  responsible_sector: string | null;
  assigned_to: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  client_id?: string | null;
  client?: { name: string | null } | null;
  assignee?: { full_name: string | null } | null;
};

const today = () => new Date().toISOString().slice(0, 10);

export function isOverdue(s: ServiceLike): boolean {
  if (!s.expected_end_date) return false;
  if (s.status === "concluido" || s.status === "cancelado") return false;
  return s.expected_end_date < today();
}

export function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((db - da) / 86400000);
}

export function overdueDays(s: ServiceLike): number {
  if (!s.expected_end_date || !isOverdue(s)) return 0;
  return Math.max(daysBetween(s.expected_end_date, today()) ?? 0, 0);
}

export function slaInfo(s: ServiceLike) {
  const planned = daysBetween(s.start_date, s.expected_end_date);
  const elapsed = daysBetween(s.start_date, s.actual_end_date ?? today());
  return { planned, elapsed };
}

// Hash determinístico para mocks visuais estáveis por id (comentários/pendências).
export function mockCount(id: string, mod: number, salt = 0): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}
