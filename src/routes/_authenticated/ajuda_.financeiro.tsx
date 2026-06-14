import { createFileRoute } from "@tanstack/react-router";
import { DollarSign } from "lucide-react";
import { ModuleHelpPage } from "@/components/help/ModuleHelpPage";
import { financeiroOverview, financeiroPipeline, financeiroHowTo, financeiroFAQ } from "@/content/help/financeiro";

export const Route = createFileRoute("/_authenticated/ajuda_/financeiro")({
  component: () => (
    <ModuleHelpPage
      icon={DollarSign}
      title="Módulo Financeiro"
      subtitle="Lançamentos, contas a receber e a pagar, cadastros, relatórios e moedas."
      goToHref="/financeiro"
      goToLabel="Ir para o Financeiro"
      overview={financeiroOverview}
      pipeline={financeiroPipeline}
      howTo={financeiroHowTo}
      faq={financeiroFAQ}
    />
  ),
});
