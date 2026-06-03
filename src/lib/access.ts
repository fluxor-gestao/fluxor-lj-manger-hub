import type { AppRole } from "@/contexts/AuthContext";

/**
 * Matriz de acesso: rota → papéis permitidos.
 * Admin sempre tem acesso (resolvido no `hasRole`).
 */
export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  "/hub": ["admin", "comercial", "financeiro", "operacao"],
  "/comercial": ["comercial"],
  "/financeiro": ["financeiro"],
  "/operacao": ["operacao"],
  "/conciliacao": ["financeiro"],
  "/bi": ["comercial", "financeiro", "operacao"],
  "/gestao": ["admin"],
  "/admin": ["admin"],
  "/ajuda": ["admin", "comercial", "financeiro", "operacao"],
};

/**
 * Cada dashboard de BI é vinculado ao papel do módulo correspondente.
 * Um usuário só vê/abre o dashboard se tiver o papel (admin vê todos).
 */
export const BI_DASHBOARD_ACCESS: Record<string, AppRole[]> = {
  comercial: ["comercial"],
  financeiro: ["financeiro"],
  operacao: ["operacao"],
};

export function canAccessRoute(pathname: string, hasRole: (r: AppRole | AppRole[]) => boolean): boolean {
  // Match por prefixo para sub-rotas (/comercial/devis/...)
  const match = Object.keys(ROUTE_ACCESS)
    .sort((a, b) => b.length - a.length)
    .find((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!match) return true; // rotas não mapeadas → liberar
  return hasRole(ROUTE_ACCESS[match]);
}

export function canAccessBiDashboard(
  id: string,
  hasRole: (r: AppRole | AppRole[]) => boolean,
): boolean {
  const required = BI_DASHBOARD_ACCESS[id];
  if (!required) return true;
  return hasRole(required);
}
