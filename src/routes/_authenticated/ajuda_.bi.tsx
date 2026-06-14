import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ModuleHelpPage } from "@/components/help/ModuleHelpPage";
import { biOverview, biHowTo, biFAQ } from "@/content/help/bi";

export const Route = createFileRoute("/_authenticated/ajuda_/bi")({
  component: () => (
    <ModuleHelpPage
      icon={BarChart3}
      title="Módulo BI"
      subtitle="Dashboards de Business Intelligence por área, com embeds Power BI e painéis nativos."
      goToHref="/bi"
      goToLabel="Ir para BI"
      overview={biOverview}
      howTo={biHowTo}
      faq={biFAQ}
    />
  ),
});
