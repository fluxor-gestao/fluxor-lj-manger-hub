import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { ModuleHelpPage } from "@/components/help/ModuleHelpPage";
import { mensagensOverview, mensagensHowTo, mensagensFAQ } from "@/content/help/mensagens";

export const Route = createFileRoute("/_authenticated/ajuda_/mensagens")({
  component: () => (
    <ModuleHelpPage
      icon={MessageSquare}
      title="Central de Mensagens"
      subtitle="Chat interno: conversas diretas, grupos, presença em tempo real e anexos."
      goToHref="/mensagens"
      goToLabel="Ir para Mensagens"
      overview={mensagensOverview}
      howTo={mensagensHowTo}
      faq={mensagensFAQ}
    />
  ),
});
