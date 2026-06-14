import { createFileRoute } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { ModuleHelpPage } from "@/components/help/ModuleHelpPage";
import { operacaoOverview, operacaoPipeline, operacaoHowTo, operacaoFAQ } from "@/content/help/operacao";

export const Route = createFileRoute("/_authenticated/ajuda_/operacao")({
  component: () => (
    <ModuleHelpPage
      icon={Settings2}
      title="Módulo Operação"
      subtitle="Serviços contratados em execução: Kanban, lista, tarefas, comentários e faturas avulsas."
      goToHref="/operacao"
      goToLabel="Ir para Operação"
      overview={operacaoOverview}
      pipeline={operacaoPipeline}
      howTo={operacaoHowTo}
      faq={operacaoFAQ}
    />
  ),
});
