import { Outlet, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AccessGuard } from "@/components/AccessGuard";
import { CompanySelector } from "@/components/CompanySelector";
import { FluxorSupportButton } from "@/components/fluxor/FluxorSupportButton";


export function AppLayout() {
  const isNavigating = useRouterState({
    select: (s) => s.isLoading || s.isTransitioning,
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-4 shrink-0">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-3">
              <FluxorSupportButton />
              <CompanySelector />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <AccessGuard>
              <Outlet />
            </AccessGuard>
          </main>
        </div>
      </div>
      {isNavigating && (
        <div className="fixed inset-0 z-50 bg-background">
          <LoadingScreen message="Abrindo sistema..." />
        </div>
      )}
    </SidebarProvider>
  );
}
