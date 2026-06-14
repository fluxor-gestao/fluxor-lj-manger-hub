import { type HowToItem } from "@/components/help/HowToAccordion";
import { type FAQItem } from "@/components/help/HelpFAQ";

export const gestaoOverview = [
  "Gestão é o painel executivo: junta indicadores de Comercial, Financeiro e Operação numa visão única para tomada de decisão.",
  "Quem opera: gerência e direção. Quem consulta: sócios e líderes.",
  "Inclui DRE Gerencial (Demonstração do Resultado do Exercício) e Importação Histórica para alimentar dados de períodos anteriores.",
  "Os números respeitam a empresa/BU ativa no banner do topo — troque para alternar entre PJ.",
];

export const gestaoHowTo: HowToItem[] = [
  { id: "kpis", question: "O que cada KPI do topo significa?",
    steps: [
      "Receita: total entrado no período (lançamentos conciliados de tipo receita).",
      "Despesa: total saído no período (lançamentos conciliados de tipo despesa).",
      "Margem: (Receita − Despesa) ÷ Receita.",
      "Propostas aceitas: contagem de devis com status 'Aceita' no período.",
      "Conversão: aceitas ÷ enviadas, do período selecionado.",
    ] },
  { id: "filtros", question: "Como filtrar o painel por período?",
    steps: [
      "Use os atalhos rápidos: Hoje, Mês atual, Ano atual.",
      "Ou escolha datas personalizadas no seletor.",
      "Todos os gráficos e KPIs se recalculam imediatamente.",
    ] },
  { id: "dre", question: "Como consultar o DRE Gerencial?",
    steps: [
      "Vá na aba 'DRE Gerencial' dentro de Gestão.",
      "Escolha período e BU.",
      "Veja a estrutura: Receita Bruta → Deduções → Receita Líquida → Custos → Lucro Operacional → Resultado.",
      "Cada linha pode ser expandida para ver os lançamentos que a compõem.",
    ] },
  { id: "import-historica", question: "Como importar dados históricos (anos anteriores)?",
    steps: [
      "Vá na aba 'Importação Histórica'.",
      "Baixe o template CSV oferecido.",
      "Preencha com os lançamentos do período anterior.",
      "Faça upload. O sistema valida e mostra prévia antes de gravar.",
    ] },
];

export const gestaoFAQ: FAQItem[] = [
  { id: "diff-financeiro", question: "Por que os números aqui diferem da Central Financeira?",
    answer: <>Gestão considera apenas lançamentos com status 'conciliado'. A Central Financeira mostra todos os status (pendente, pago, conciliado). Para fechamento gerencial, sempre olhe Gestão.</> },
  { id: "bu-all", question: "Posso ver as três empresas somadas?",
    answer: <>Sim. No banner do topo, escolha 'Todas as empresas' (quando disponível para o seu perfil). Os KPIs são consolidados, com legenda mostrando a quebra por BU.</> },
  { id: "acesso", question: "Por que eu não vejo o módulo Gestão?",
    answer: <>Gestão é restrita a usuários com papel 'admin'. Peça acesso ao administrador do sistema.</> },
];
