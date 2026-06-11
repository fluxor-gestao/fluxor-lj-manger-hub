import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, Tags, ClipboardCheck, Users, Building2, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/comercial/")({
  component: ComercialHub,
});

type SubModule = {
  title: string;
  description: string;
  route: string;
  icon: LucideIcon;
  gradient: string;
};

const subModules: SubModule[] = [
  {
    title: "Devis",
    description: "Gestão comercial de propostas",
    route: "/comercial/devis",
    icon: FileText,
    gradient: "from-blue-500 to-blue-700",
  },
  {
    title: "Clientes",
    description: "Gestão da base de clientes",
    route: "/comercial/clientes",
    icon: Users,
    gradient: "from-indigo-500 to-indigo-700",
  },
  {
    title: "Áreas",
    description: "Catálogo oficial de unidades e setores",
    route: "/comercial/areas",
    icon: Building2,
    gradient: "from-orange-500 to-orange-700",
  },
  {
    title: "Precificação",
    description: "Tabela de preços e busca de mercado",
    route: "/comercial/precificacao",
    icon: Tags,
    gradient: "from-emerald-500 to-emerald-700",
  },
  {
    title: "Mapa de Aprovação",
    description: "Inteligência geográfica e conversão",
    route: "/comercial/mapa-aprovacao",
    icon: ClipboardCheck,
    gradient: "from-purple-500 to-purple-700",
  },
];

function SubModuleCard({ item }: { item: SubModule }) {
  const navigate = useNavigate();
  const Icon = item.icon;
  return (
    <Card
      onClick={() => navigate({ to: item.route })}
      className={`group cursor-pointer min-h-[180px] p-6 border-0 text-white bg-gradient-to-br ${item.gradient} shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between`}
    >
      <Icon className="h-12 w-12 text-white/95" strokeWidth={1.75} />
      <div>
        <h3 className="font-display text-xl font-semibold leading-tight">{item.title}</h3>
        <p className="text-sm text-white/85 mt-1">{item.description}</p>
      </div>
    </Card>
  );
}

function ComercialHub() {
  return (
    <div className="space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl md:text-4xl font-bold font-display">Comercial</h1>
        <p className="text-muted-foreground mt-1">Escolha um sub-módulo para começar</p>
      </div>
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {subModules.map((m) => (
          <SubModuleCard key={m.route} item={m} />
        ))}
      </div>
    </div>
  );
}
