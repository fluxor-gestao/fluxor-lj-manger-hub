import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Wallet, ArrowDownCircle, ArrowUpCircle, BarChart3, ArrowLeftRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/financeiro/")({
  component: FinanceiroHub,
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
    title: "Central Financeira",
    description: "Lançamentos e fluxo de caixa",
    route: "/financeiro/central",
    icon: Wallet,
    gradient: "from-blue-500 to-blue-700",
  },
  {
    title: "Cadastro de Contas",
    description: "Contas LJ, categorias e métodos",
    route: "/financeiro/central", // Usando a mesma rota para facilitar, mas com abas
    icon: Landmark,
    gradient: "from-slate-600 to-slate-800",
  },
  {
    title: "Contas a Receber",
    description: "Recebimentos em aberto e histórico",
    route: "/financeiro/contas-a-receber",
    icon: ArrowDownCircle,
    gradient: "from-emerald-500 to-emerald-700",
  },
  {
    title: "Contas a Pagar",
    description: "Pagamentos em aberto e vencimentos",
    route: "/financeiro/contas-a-pagar",
    icon: ArrowUpCircle,
    gradient: "from-rose-500 to-rose-700",
  },
  {
    title: "Conciliação",
    description: "Conferir cobranças e pagamentos",
    route: "/conciliacao",
    icon: ArrowLeftRight,
    gradient: "from-amber-500 to-amber-700",
  },
  {
    title: "Rapport",
    description: "Relatórios e indicadores financeiros",
    route: "/financeiro/rapport",
    icon: BarChart3,
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

function FinanceiroHub() {
  return (
    <div className="space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl md:text-4xl font-bold font-display">Financeiro</h1>
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
