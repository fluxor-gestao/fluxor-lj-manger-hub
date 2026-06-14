import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { LoadingScreen } from "@/components/LoadingScreen";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  // Uma vez que o usuário entrou nesta área, mantemos a UI montada para
  // evitar flicker de "Verificando acesso..." em refresh de token, foco
  // de aba ou blips transitórios de sessão.
  const hasAuthenticatedRef = useRef(false);
  if (user) hasAuthenticatedRef.current = true;

  useEffect(() => {
    // Só redireciona para /auth se realmente não há usuário e nunca houve
    // sessão ativa nesta montagem (evita kick-out em blip).
    if (!loading && !user && !hasAuthenticatedRef.current) {
      navigate({ to: "/auth", replace: true });
    }
  }, [user, loading, navigate]);

  if (loading && !hasAuthenticatedRef.current) {
    return <LoadingScreen message="Verificando acesso..." />;
  }
  if (!user && !hasAuthenticatedRef.current) return null;

  return <AppLayout />;
}
