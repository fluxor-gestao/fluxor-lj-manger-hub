import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { appVersion } from "@/config/appVersion";
import logo from "@/assets/logo.svg";


export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: currentVersion } = useQuery({
    queryKey: ["current-system-version"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_versions")
        .select("version")
        .eq("is_current", true)
        .maybeSingle();
      return data?.version || appVersion.version;
    },
  });

  useEffect(() => {
    if (user) navigate({ to: "/hub", replace: true });
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        // Redireciona imperativamente para garantir entrada no app
        window.location.assign("/hub");
        return;
      }
      toast.error("Não foi possível iniciar a sessão. Tente novamente.");
      setLoading(false);
    } catch (err: any) {
      console.error("Login error", err);
      toast.error(err?.message ?? "Erro ao entrar");
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto">
            <img src={logo} alt="Lundgaard Jensen" className="h-auto w-[220px]" />
          </div>
          <CardTitle className="font-display text-2xl">Lundgaard Hub</CardTitle>
          <p className="text-sm text-primary">Faça login</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-3">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : "Entrar"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
              v{currentVersion || appVersion.version}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
