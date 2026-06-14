import { type HowToItem } from "@/components/help/HowToAccordion";
import { type FAQItem } from "@/components/help/HelpFAQ";

export const biOverview = [
  "BI (Business Intelligence) reúne dashboards interativos por área: Comercial, Financeiro e Operação.",
  "Cada dashboard é vinculado ao papel do usuário: você só vê os dashboards das áreas em que tem permissão (admin vê todos).",
  "Alguns dashboards são embeds do Power BI (atualizados pela equipe de dados), outros são gerados nativamente dentro do sistema.",
  "Os dados nativos vêm direto do banco — sempre atuais. Os embeds Power BI seguem a frequência de atualização configurada lá.",
];

export const biHowTo: HowToItem[] = [
  { id: "abrir", question: "Como abrir um dashboard?",
    steps: [
      "Vá em BI no menu lateral.",
      "Clique no card do dashboard desejado (Comercial, Financeiro ou Operação).",
      "O painel ocupa a área principal. Use o botão 'Voltar' para retornar ao seletor.",
    ] },
  { id: "filtros-pbi", question: "Como filtrar os dashboards Power BI?",
    steps: [
      "Use os controles internos do próprio Power BI no painel embed.",
      "Filtros por período, BU e dimensão ficam na barra lateral do dashboard.",
      "As alterações não são salvas entre sessões — abra novamente para resetar.",
    ] },
  { id: "filtros-nativos", question: "Como filtrar os dashboards nativos (Comercial e Financeiro)?",
    steps: [
      "Os filtros (BU, período, status) ficam no topo do painel.",
      "Cada gráfico mostra um aspecto: funil, série temporal, distribuição.",
      "Passe o mouse sobre as séries para ver valores detalhados em tooltip.",
    ] },
];

export const biFAQ: FAQItem[] = [
  { id: "sem-dashboard", question: "Não vejo nenhum dashboard na lista. O que houve?",
    answer: <>Você não tem papel atribuído (comercial, financeiro ou operação). Peça ao admin para conceder a permissão correspondente.</> },
  { id: "embed-vazio", question: "O painel Power BI carregou em branco",
    answer: <>Geralmente é bloqueio do navegador a iframes do Microsoft. Tente em janela anônima ou libere cookies de terceiros para app.powerbi.com.</> },
  { id: "diff-numeros", question: "Os números do BI estão diferentes do Financeiro",
    answer: <>O BI Financeiro nativo usa lançamentos conciliados. Os embeds Power BI seguem a janela de atualização configurada pela equipe de dados (em geral diária).</> },
];
