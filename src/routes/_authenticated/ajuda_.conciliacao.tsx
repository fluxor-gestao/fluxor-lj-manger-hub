import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight } from "lucide-react";
import { ModuleHelpPage } from "@/components/help/ModuleHelpPage";
import { conciliacaoOverview, conciliacaoPipeline, conciliacaoHowTo, conciliacaoFAQ } from "@/content/help/conciliacao";

export const Route = createFileRoute("/_authenticated/ajuda_/conciliacao")({
  component: () => (
    <ModuleHelpPage
      icon={ArrowLeftRight}
      title="Módulo Conciliação"
      subtitle="Importação de extratos (OFX/PDF) e bate com os lançamentos do sistema."
      goToHref="/conciliacao"
      goToLabel="Ir para Conciliação"
      overview={conciliacaoOverview}
      pipeline={conciliacaoPipeline}
      howTo={conciliacaoHowTo}
      faq={conciliacaoFAQ}
    />
  ),
});
