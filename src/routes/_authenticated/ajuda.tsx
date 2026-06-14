import { createFileRoute } from "@tanstack/react-router";
import {
  ShoppingCart,
  DollarSign,
  Settings2,
  Building2,
  BarChart3,
  Shield,
  ArrowLeftRight,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { HelpHero } from "@/components/help/HelpHero";
import { ModuleCard } from "@/components/help/ModuleCard";

const modules = [
  {
    icon: ShoppingCart,
    title: "Comercial",
    description: "Clientes, propostas (devis), envio, aceite e cobrança automática.",
    to: "/ajuda/comercial",
    available: true,
  },
  {
    icon: DollarSign,
    title: "Financeiro",
    description: "Lançamentos, contas a receber e pagar, cadastros, rapport e moedas.",
    to: "/ajuda/financeiro",
    available: true,
  },
  {
    icon: ArrowLeftRight,
    title: "Conciliação",
    description: "Importação de extratos OFX/PDF e bate com os lançamentos.",
    to: "/ajuda/conciliacao",
    available: true,
  },
  {
    icon: Settings2,
    title: "Operação",
    description: "Serviços em execução: Kanban, lista, tarefas, comentários e faturas avulsas.",
    to: "/ajuda/operacao",
    available: true,
  },
  {
    icon: Building2,
    title: "Gestão",
    description: "Painel executivo, DRE Gerencial e importação histórica.",
    to: "/ajuda/gestao",
    available: true,
  },
  {
    icon: BarChart3,
    title: "BI",
    description: "Dashboards Comercial, Financeiro e Operação (Power BI e nativos).",
    to: "/ajuda/bi",
    available: true,
  },
  {
    icon: MessageSquare,
    title: "Mensagens",
    description: "Chat interno com presença, conversas diretas, grupos e anexos.",
    to: "/ajuda/mensagens",
    available: true,
  },
  {
    icon: Shield,
    title: "Admin",
    description: "Usuários, papéis, configurações, versão, backup e API keys.",
    to: "/ajuda/admin",
    available: true,
  },
];

function AjudaIndex() {
  return (
    <div className="space-y-6">
      <HelpHero
        icon={HelpCircle}
        title="Central de Ajuda"
        subtitle="Aprenda a operar cada módulo do sistema. Escolha um módulo abaixo para ver o passo a passo, o fluxo e as dúvidas frequentes."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => (
          <ModuleCard key={m.title} {...m} />
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/ajuda")({
  component: AjudaIndex,
});
