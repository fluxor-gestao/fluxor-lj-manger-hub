import { type PipelineStep } from "@/components/help/PipelineDiagram";
import { type HowToItem } from "@/components/help/HowToAccordion";
import { type FAQItem } from "@/components/help/HelpFAQ";

export const conciliacaoOverview = [
  "Conciliação é o módulo que confronta os lançamentos do sistema com o extrato real do banco. Garante que tudo o que está no sistema realmente entrou ou saiu da conta.",
  "Quem opera: equipe financeira. Acontece tipicamente em ciclo semanal ou mensal, conforme a periodicidade dos extratos.",
  "Aceita dois formatos de extrato: OFX (recomendado, padrão dos bancos) e PDF de extrato (parser local para alguns bancos como Bradesco).",
  "O sistema detecta duplicidades por hash de arquivo e hash de linha — você pode reimportar o mesmo extrato sem medo de duplicar transações.",
];

export const conciliacaoPipeline: PipelineStep[] = [
  { id: "import", label: "Importação do extrato", tone: "neutral", responsible: "Financeiro",
    description: "Upload do arquivo OFX ou PDF do banco. O sistema lê as transações e descarta duplicatas." },
  { id: "match", label: "Sugestão de match", tone: "blue", responsible: "Sistema",
    description: "Para cada linha do extrato, o sistema busca um lançamento equivalente no sistema (mesma data, valor e conta) e marca como 'sugerido'." },
  { id: "review", label: "Revisão humana", tone: "amber", responsible: "Financeiro",
    description: "Você confirma os matches sugeridos, ajusta os divergentes ou cria um novo lançamento direto da linha do extrato." },
  { id: "conciliado", label: "Conciliado", tone: "emerald", responsible: "Financeiro",
    description: "Linha confirmada. O lançamento correspondente no Financeiro também muda para status 'conciliado'." },
];

export const conciliacaoHowTo: HowToItem[] = [
  { id: "importar", question: "Como importar um extrato bancário?",
    steps: [
      "Vá em Conciliação no menu lateral.",
      "Selecione a conta bancária no topo.",
      "Clique em 'Importar extrato' e selecione o arquivo OFX ou PDF.",
      "Aguarde o parsing. As linhas aparecem na tabela com status 'pendente' ou 'sugerido'.",
    ] },
  { id: "conciliar", question: "Como conciliar uma linha do extrato com um lançamento?",
    steps: [
      "Na tabela, encontre a linha pendente e clique em 'Buscar lançamento'.",
      "O sistema lista candidatos por proximidade de data e valor.",
      "Clique em 'Confirmar' no lançamento correto.",
      "A linha do extrato e o lançamento mudam ambos para 'conciliado'.",
    ] },
  { id: "criar-do-extrato", question: "Como criar um lançamento direto a partir de uma linha do extrato?",
    steps: [
      "Use o botão 'Criar lançamento' na linha pendente.",
      "Os campos data, valor e descrição vêm pré-preenchidos.",
      "Complete categoria, BU e método e salve. A linha já é conciliada automaticamente.",
    ] },
  { id: "ignorar", question: "Como ignorar uma linha que não precisa ser conciliada (ex.: tarifa bancária irrelevante)?",
    steps: [
      "Na linha pendente, clique em 'Ignorar' (ícone do olho cortado).",
      "A linha some das pendências mas continua registrada no histórico, marcada como 'ignorado'.",
    ] },
  { id: "desfazer", question: "Como desfazer uma conciliação?",
    steps: [
      "Filtre por status 'conciliado'.",
      "Na linha desejada, use 'Desfazer conciliação' (ícone de rotação reversa).",
      "A linha volta para 'pendente' e o lançamento associado também.",
    ] },
];

export const conciliacaoFAQ: FAQItem[] = [
  { id: "duplicado", question: "Importei o mesmo arquivo duas vezes — vai duplicar?",
    answer: <>Não. O sistema calcula um hash do arquivo e de cada linha; duplicatas são descartadas automaticamente e mostradas no resumo da importação.</> },
  { id: "pdf-banco", question: "Meu banco não aparece como suportado no parser PDF",
    answer: <>O parser PDF cobre formatos limitados (ex.: Bradesco). Para outros bancos, use o arquivo OFX disponível no internet banking — ele funciona para qualquer banco brasileiro.</> },
  { id: "valor-divergente", question: "O extrato mostra um valor ligeiramente diferente do lançamento (centavos). O que faço?",
    answer: <>Confirme manualmente o match — o sistema marca como 'divergente'. Se a diferença for legítima (tarifa, IOF), crie um lançamento complementar para fechar.</> },
  { id: "transferencia", question: "Transferências entre contas próprias aparecem em duplicidade no extrato",
    answer: <>É normal: cada conta tem sua linha no extrato. Concilie cada uma com sua metade da transferência (a saída em uma conta, a entrada na outra). O par já foi criado no Financeiro quando você lançou a transferência.</> },
];
