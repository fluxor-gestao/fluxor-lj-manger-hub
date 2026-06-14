import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { LoadingScreen } from "@/components/LoadingScreen";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

// Detecta sincronamente se há uma sessão Supabase persistida no localStorage.
// Evita o flicker de "Verificando acesso..." em remounts/refreshes quando
// o usuário já está logado — a validação real continua acontecendo via
// AuthContext (getSession + onAuthStateChange).
function hasPersistedSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.access_token) return true;
        } catch {
          if (raw.length > 20) return true;
        }
      }
    }
  } catch {
    // localStorage indisponível — segue o fluxo normal
  }
  return false;
}

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  // Uma vez que o usuário entrou nesta área, mantemos a UI montada para
  // evitar flicker de "Verificando acesso..." em refresh de token, foco
  // de aba ou blips transitórios de sessão.
  // Inicia true se já existe sessão persistida — evita splash em remounts.
  const hasAuthenticatedRef = useRef<boolean>(hasPersistedSession());
  if (user) hasAuthenticatedRef.current = true;

  useEffect(() => {
    // Só redireciona para /auth se realmente não há usuário, o carregamento
    // terminou e não existe sessão persistida no storage.
    if (!loading && !user && !hasPersistedSession()) {
      hasAuthenticatedRef.current = false;
      navigate({ to: "/auth", replace: true });
    }
  }, [user, loading, navigate]);

  if (loading && !hasAuthenticatedRef.current) {
    return <LoadingScreen message="Verificando acesso..." />;
  }
  if (!user && !hasAuthenticatedRef.current) return null;

  return <AppLayout />;
}
