import {
  Home,
  ShoppingCart,
  DollarSign,
  Settings2,
  Building2,
  BarChart3,
  Shield,
  HelpCircle,
  LogOut,
  Loader2,
} from "lucide-react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoBanner from "@/assets/logo-banner.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: typeof Home;
  /** Papéis que veem o item. Vazio/ausente = todos autenticados. Admin sempre vê. */
  roles?: AppRole[];
};

const mainItems: NavItem[] = [
  { title: "Início", url: "/hub", icon: Home },
  { title: "Comercial", url: "/comercial", icon: ShoppingCart, roles: ["comercial"] },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign, roles: ["financeiro"] },
  { title: "Operação", url: "/operacao", icon: Settings2, roles: ["operacao"] },
];

const managementItems: NavItem[] = [
  { title: "Gestão", url: "/gestao", icon: Building2, roles: ["admin"] },
  { title: "BI / Business Intelligence", url: "/bi", icon: BarChart3, roles: ["comercial", "financeiro", "operacao"] },
  { title: "Opções / Usuários", url: "/admin", icon: Shield, roles: ["admin"] },
  { title: "Central de Ajuda", url: "/ajuda", icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasRole, refreshRole, signOut } = useAuth();

  const { data: currentVersion, isLoading: loadingVersion } = useQuery({
    queryKey: ["current-system-version"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_versions")
        .select("version")
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data?.version || "1.2.0";
    },
  });

  const isActive = (path: string) =>
    path === "/hub" ? location.pathname === "/hub" : location.pathname.startsWith(path);

  const canSee = (item: NavItem) => !item.roles || item.roles.length === 0 || hasRole(item.roles);

  const visibleMain = mainItems.filter(canSee);
  const visibleManagement = managementItems.filter(canSee);

  const handleNavigate = async (url: string) => {
    if (url === "/admin") await refreshRole();
    navigate({ to: url });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center justify-center">
          {collapsed ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
              <span className="text-xs font-bold text-sidebar-primary-foreground">LJ</span>
            </div>
          ) : (
            <img src={logoBanner} alt="Lundgaard Jensen" className="h-auto w-[160px]" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton isActive={isActive(item.url)} onClick={() => handleNavigate(item.url)}>
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleManagement.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton isActive={isActive(item.url)} onClick={() => handleNavigate(item.url)}>
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && user && (
          <div className="flex flex-col gap-1 px-2">
            <p className="truncate text-xs text-sidebar-foreground/50">
              {user.email}
            </p>
            <p className="text-[10px] font-medium text-sidebar-foreground/30">
              v{appVersion.version}
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
