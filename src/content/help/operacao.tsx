import { type PipelineStep } from "@/components/help/PipelineDiagram";
import { type HowToItem } from "@/components/help/HowToAccordion";
import { type FAQItem } from "@/components/help/HelpFAQ";

export const operacaoOverview = [
  "Operação é onde o trabalho contratado acontece: cada proposta aceita vira um serviço aqui, com prazo, responsável e status.",
  "Quem opera: equipe técnica (advocacia, ambiental, contábil) e líderes de setor. Quem consulta: gerência e comercial.",
  "Dois modos de visualização: Kanban (cards por status) e Lista (tabela densa com filtros e busca). Você escolhe pelo seletor no topo.",
  "Os KPIs no topo mostram volume por status, prazos vencidos e produtividade. O bloco 'Insights Operacionais' destaca pontos de atenção automaticamente.",
];

export const operacaoPipeline: PipelineStep[] = [
  { id: "criado", label: "A iniciar", tone: "neutral", responsible: "Sistema (vindo do Comercial)",
    description: "O serviço nasce automaticamente quando uma proposta é aceita. Herda cliente, BU, setor responsável, título e prazo do devis." },
  { id: "andamento", label: "Em andamento", tone: "blue", responsible: "Equipe técnica",
    description: "Você assumiu o serviço e começou a trabalhar. Comentários, tarefas e timeline ficam registrados no card." },
  { id: "revisao", label: "Em revisão", tone: "amber", responsible: "Líder de setor",
    description: "Trabalho concluído pelo executor, aguardando revisão antes de entregar ao cliente." },
  { id: "concluido", label: "Concluído", tone: "emerald", responsible: "Equipe técnica",
    description: "Serviço entregue. Data real de conclusão registrada. Continua visível para histórico e relatórios." },
  { id: "cancelado", label: "Cancelado", tone: "violet", responsible: "Líder de setor",
    description: "Serviço encerrado sem entrega (cliente desistiu, escopo mudou). Fica registrado mas não conta nos KPIs de produção." },
];

export const operacaoHowTo: HowToItem[] = [
  { id: "ver-servicos", question: "Onde vejo os serviços do meu setor?",
    steps: [
      "Vá em Operação no menu lateral.",
      "Use os filtros do topo para escolher BU, setor responsável, responsável atribuído ou status.",
      "Alterne entre Kanban e Lista pelo seletor no canto superior direito.",
    ] },
  { id: "abrir-servico", question: "Como abrir e atualizar um serviço?",
    steps: [
      "Clique no card (Kanban) ou na linha (Lista) para abrir o painel lateral.",
      "Veja abas de detalhes, comentários, tarefas e timeline.",
      "Mude status pelo seletor, adicione comentário ou crie uma tarefa interna.",
      "Todas as alterações ficam registradas na timeline com autor e data.",
    ] },
  { id: "atribuir", question: "Como atribuir um responsável a um serviço?",
    steps: [
      "Abra o serviço.",
      "No painel lateral, use o campo 'Responsável' para escolher um usuário.",
      "Ele passa a ver o serviço nos filtros 'meus serviços' e recebe destaque nos KPIs.",
    ] },
  { id: "novo-processo", question: "Como criar um serviço manualmente (sem vir do Comercial)?",
    steps: [
      "Clique em 'Novo processo' no topo.",
      "Selecione cliente, BU, setor responsável, título e prazo esperado.",
      "Salve. O serviço aparece na coluna 'A iniciar'.",
      "Atenção: o caminho normal é via proposta aceita no Comercial — só crie manual em casos excepcionais.",
    ] },
  { id: "fatura-avulsa", question: "Como gerar uma fatura avulsa para um serviço?",
    steps: [
      "Abra o serviço.",
      "Use a ação 'Nova fatura avulsa'.",
      "Informe valor, descrição e data.",
      "A fatura é criada no Financeiro como conta a receber, vinculada a este serviço e ao cliente.",
    ] },
  { id: "tarefas", question: "Como usar tarefas e comentários dentro de um serviço?",
    steps: [
      "No painel do serviço, vá nas abas 'Tarefas' e 'Comentários'.",
      "Tarefas têm título, responsável e status (a fazer / em andamento / feita).",
      "Comentários são livres — use para registrar conversas com o cliente, decisões ou pendências.",
      "Anexos podem ser adicionados em ambos.",
    ] },
];

export const operacaoFAQ: FAQItem[] = [
  { id: "servico-nao-apareceu", question: "Aceitei a proposta mas o serviço não apareceu na Operação",
    answer: <>O serviço é criado no instante do aceite. Verifique: (1) o filtro de BU no topo bate com a empresa da proposta; (2) o setor responsável da proposta é o que você está filtrando; (3) o status do devis é mesmo 'Aceita'. Se nada disso resolver, avise o time técnico.</> },
  { id: "alterar-prazo", question: "O cliente pediu prorrogação. Posso alterar o prazo?",
    answer: <>Sim. Abra o serviço, ajuste 'Prazo esperado' e registre um comentário com o motivo. A timeline preserva o histórico de alterações.</> },
  { id: "concluido-volta", question: "Marquei como concluído por engano. Consigo reabrir?",
    answer: <>Sim. Mude o status de volta para 'Em andamento'. A data real de conclusão é limpa quando o serviço sai de 'concluído'.</> },
  { id: "insights", question: "O que é o bloco 'Insights Operacionais'?",
    answer: <>É uma análise automática do board atual: aponta serviços vencidos, sem responsável, parados há muito tempo, etc. Use como checklist de pontos a tratar.</> },
];
