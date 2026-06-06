import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContasTable } from "@/components/financeiro/ContasTable";

export const Route = createFileRoute("/_authenticated/financeiro/contas-a-pagar")({
  component: ContasAPagarPage,
});

function ContasAPagarPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/financeiro" })}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Pagamentos em aberto</p>
        </div>
      </div>
      <ContasTable kind="pagar" />
    </div>
  );
}
