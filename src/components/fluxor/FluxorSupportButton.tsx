import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FluxorSupportModal } from "./FluxorSupportModal";
import { installFluxorErrorHandler } from "@/lib/fluxorMonitor/fluxorErrorHandler";

export function FluxorSupportButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    installFluxorErrorHandler();
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        title="Abrir chamado de suporte"
      >
        <LifeBuoy className="h-4 w-4" />
        <span className="hidden sm:inline">Suporte</span>
      </Button>
      <FluxorSupportModal open={open} onOpenChange={setOpen} />
    </>
  );
}
