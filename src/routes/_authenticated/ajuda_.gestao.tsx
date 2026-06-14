import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { ModuleHelpPage } from "@/components/help/ModuleHelpPage";
import { gestaoOverview, gestaoHowTo, gestaoFAQ } from "@/content/help/gestao";

export const Route = createFileRoute("/_authenticated/ajuda_/gestao")({
  component: () => (
    <ModuleHelpPage
      icon={Building2}
      title="Módulo Gestão"
      subtitle="Painel executivo com KPIs consolidados, DRE Gerencial e importação histórica."
      goToHref="/gestao"
      goToLabel="Ir para Gestão"
      overview={gestaoOverview}
      howTo={gestaoHowTo}
      faq={gestaoFAQ}
    />
  ),
});
