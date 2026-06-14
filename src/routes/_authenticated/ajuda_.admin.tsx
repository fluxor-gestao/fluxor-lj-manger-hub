import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { ModuleHelpPage } from "@/components/help/ModuleHelpPage";
import { adminOverview, adminHowTo, adminFAQ } from "@/content/help/admin";

export const Route = createFileRoute("/_authenticated/ajuda_/admin")({
  component: () => (
    <ModuleHelpPage
      icon={Shield}
      title="Módulo Admin"
      subtitle="Usuários, papéis, configurações, versão, changelog, diagnóstico, backup e API keys."
      goToHref="/admin"
      goToLabel="Ir para Admin"
      overview={adminOverview}
      howTo={adminHowTo}
      faq={adminFAQ}
    />
  ),
});
