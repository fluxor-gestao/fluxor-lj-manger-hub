import { Link } from "@tanstack/react-router";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpHero } from "@/components/help/HelpHero";
import { HelpCallout } from "@/components/help/HelpCallout";
import { PipelineDiagram, type PipelineStep } from "@/components/help/PipelineDiagram";
import { HowToAccordion, type HowToItem } from "@/components/help/HowToAccordion";
import { HelpFAQ, type FAQItem } from "@/components/help/HelpFAQ";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  goToHref?: string;
  goToLabel?: string;
  overview: string[];
  pipeline?: PipelineStep[];
  howTo: HowToItem[];
  faq: FAQItem[];
}

export function ModuleHelpPage({
  icon,
  title,
  subtitle,
  goToHref,
  goToLabel,
  overview,
  pipeline,
  howTo,
  faq,
}: Props) {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" asChild size="sm">
          <Link to="/ajuda">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar à Central de Ajuda
          </Link>
        </Button>
        {goToHref && (
          <Button variant="outline" asChild size="sm">
            <a href={goToHref}>{goToLabel ?? "Abrir módulo"}</a>
          </Button>
        )}
      </div>

      <HelpHero icon={icon} title={title} subtitle={subtitle} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Visão geral</h2>
        <div className="space-y-2">
          {overview.map((line, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </section>

      {pipeline && pipeline.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Fluxo do módulo</h2>
          <p className="text-sm text-muted-foreground">
            Clique em qualquer etapa para ver o que acontece e quem é o responsável.
          </p>
          <PipelineDiagram steps={pipeline} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Como eu faço para…</h2>
        <p className="text-sm text-muted-foreground">
          Tarefas práticas do dia a dia. Clique para expandir cada uma.
        </p>
        <HowToAccordion items={howTo} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Perguntas frequentes</h2>
        <HelpFAQ items={faq} />
      </section>

      <HelpCallout variant="info" title="Não encontrou sua dúvida?">
        Fale com o time técnico ou com a gerência da área. Esta página é viva e novas
        perguntas frequentes são adicionadas conforme a operação evolui.
      </HelpCallout>
    </div>
  );
}
