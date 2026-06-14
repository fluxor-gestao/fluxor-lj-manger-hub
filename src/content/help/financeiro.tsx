import { type PipelineStep } from "@/components/help/PipelineDiagram";
import { type HowToItem } from "@/components/help/HowToAccordion";
import { type FAQItem } from "@/components/help/HelpFAQ";

export const financeiroOverview = [
  "O módulo Financeiro concentra todo o dinheiro que entra e sai da empresa: lançamentos, contas a receber, contas a pagar, cadastros (contas bancárias, métodos e categorias) e relatórios (Rapport).",
  "Quem opera: equipe financeira. Quem consulta: gerência (via Gestão/BI) e comercial (para acompanhar entradas geradas pelas propostas aceitas).",
  "Tudo é organizado por unidade de negócio (BU) ativa — o banner no topo da tela mostra qual empresa você está filtrando. Trocar de empresa muda a base de dados exibida.",
  "Os lançamentos podem nascer de três origens: aceite de proposta (entrada automática de 50% pelo Comercial), importação de extrato bancário (Conciliação) ou criação manual via 'Novo lançamento'.",
];

export const financeiroPipeline: PipelineStep[] = [
  { id: "origem", label: "Origem do lançamento", tone: "neutral", responsible: "Comercial / Manual / Extrato",
    description: "Receita pode vir de proposta aceita (automática, 50%), de importação OFX/PDF na Conciliação, ou criada à mão. Despesa hoje é sempre lançada manualmente ou via extrato." },
  { id: "central", label: "Central Financeira", tone: "blue", responsible: "Financeiro",
    description: "Onde todos os lançamentos vivem. Permite filtrar por tipo (receita/despesa/transferência), conta bancária, status de conciliação, mês de competência e moeda." },
  { id: "aberto", label: "Em aberto", tone: "amber", responsible: "Financeiro",
    description: "Cobrança ou pagamento ainda não confirmado. Aparece nas listas de Contas a Receber (entradas) ou Contas a Pagar (saídas)." },
  { id: "pago", label: "Pago / Recebido", tone: "violet", responsible: "Financeiro",
    description: "Registro de pagamento feito via 'Registrar pagamento'. Move o lançamento para conciliação pendente até bater com o extrato." },
  { id: "conciliado", label: "Conciliado", tone: "emerald", responsible: "Financeiro / Conciliação",
    description: "Lançamento conferido contra a linha do extrato bancário. Status final — entra nos relatórios oficiais do Rapport e do BI." },
];

export const financeiroHowTo: HowToItem[] = [
  { id: "novo-lancamento", question: "Como criar um lançamento manual (receita, despesa ou transferência)?",
    steps: [
      "Vá em Financeiro → Central Financeira.",
      "Clique em 'Novo lançamento' no topo.",
      "Escolha o tipo: receita, despesa ou transferência entre contas.",
      "Preencha valor, data, conta bancária, categoria, método de pagamento e descrição.",
      "Para transferências, selecione conta de origem e destino — o sistema cria duas linhas pareadas.",
      "Salve. O lançamento aparece imediatamente na lista com status 'pendente'.",
    ] },
  { id: "cadastros", question: "Como cadastrar uma conta bancária, categoria ou método de pagamento?",
    steps: [
      "Vá em Financeiro → Cadastro de Contas.",
      "Use as abas para alternar entre Contas LJ, Categorias e Métodos.",
      "Clique em 'Novo' e preencha os campos pedidos (nome, empresa/BU, tipo, descrição).",
      "Ative ou desative com o switch — itens inativos não aparecem nos seletores de novos lançamentos.",
    ] },
  { id: "receber", question: "Como acompanhar e dar baixa em uma conta a receber?",
    steps: [
      "Vá em Financeiro → Contas a Receber.",
      "Filtre por status (em aberto, atrasada, recebida) ou cliente.",
      "Clique nos três pontos da linha → 'Registrar recebimento'.",
      "Informe data, valor recebido, conta de destino e método. Salve.",
      "A cobrança muda de status e passa a aparecer no extrato para conciliação.",
    ] },
  { id: "pagar", question: "Como pagar uma conta?",
    steps: [
      "Vá em Financeiro → Contas a Pagar.",
      "Selecione a conta pendente e clique em 'Registrar pagamento'.",
      "Informe data, valor, conta de origem e método.",
      "O sistema usa o Programador de Pagamentos para sinalizar cobertura (coberto/apertado/sem cobertura) com base no saldo informado.",
    ] },
  { id: "saldo-cap", question: "Como configurar o saldo disponível para o Programador de Pagamentos?",
    steps: [
      "Em Contas a Pagar, abra o painel de configurações de caixa (engrenagem).",
      "Informe 'Saldo disponível' e 'Saldo mínimo'.",
      "Os valores ficam salvos por navegador (localStorage) e alimentam os indicadores de cobertura.",
    ] },
  { id: "envio-fatura", question: "Como enviar uma fatura/lembrete por e-mail ao cliente?",
    steps: [
      "Em Contas a Receber, abra a linha desejada.",
      "Use a opção 'Pré-visualizar fatura' ou 'Pré-visualizar lembrete'.",
      "Confira o conteúdo e clique em enviar. O e-mail sai pelo domínio oficial com tracking de abertura e clique.",
      "O status do envio fica registrado no log de e-mails do sistema.",
    ] },
  { id: "rapport", question: "Como gerar um relatório no Rapport?",
    steps: [
      "Vá em Financeiro → Rapport.",
      "Escolha o período, BU e categorias.",
      "Visualize cards de KPIs, gráficos comparativos e o Smart Flow Analysis.",
      "Use 'Copiar' ou 'Exportar' para levar os números para fora do sistema.",
    ] },
  { id: "moeda", question: "Como lançar em moeda estrangeira (USD, EUR)?",
    steps: [
      "Em 'Novo lançamento', selecione a moeda diferente de BRL.",
      "O sistema busca a taxa do dia (FX Ticker) e calcula o equivalente em BRL.",
      "Você pode sobrescrever a taxa manualmente se tiver um câmbio fechado.",
      "O total em BRL é o valor usado nos relatórios consolidados.",
    ] },
];

export const financeiroFAQ: FAQItem[] = [
  { id: "entrada-sumiu", question: "Aceitei uma proposta no Comercial mas a receita não aparece. Por quê?",
    answer: <>A entrada de 50% é criada no instante do aceite. Verifique: (1) a proposta está mesmo com status 'Aceita'; (2) o valor total é maior que zero; (3) você está filtrando a BU correta no banner do topo. Se persistir, peça reprocessamento ao time técnico.</> },
  { id: "diferenca-bu", question: "Os valores mudam quando troco a empresa no topo. Está certo?",
    answer: <>Sim. Cada empresa/BU tem seus próprios lançamentos. O banner azul no topo indica qual empresa está ativa — todos os filtros, KPIs e tabelas respeitam essa escolha.</> },
  { id: "conciliacao-x-central", question: "Qual a diferença entre 'pago' e 'conciliado'?",
    answer: <>'Pago' significa que você registrou o pagamento dentro do sistema. 'Conciliado' significa que esse lançamento foi confrontado com a linha do extrato bancário importado na Conciliação. Só o status 'conciliado' é considerado final para fechamento contábil.</> },
  { id: "deletar", question: "Posso excluir um lançamento?",
    answer: <>Sim, enquanto não estiver conciliado. Após conciliado, é preciso primeiro desconciliar na tela de Conciliação. Lançamentos vindos de proposta aceita não devem ser excluídos — cancele a proposta no Comercial em vez disso.</> },
  { id: "transferencia-dupla", question: "Por que minha transferência criou duas linhas?",
    answer: <>É o comportamento correto. Toda transferência gera uma linha de saída na conta de origem e uma linha de entrada na conta de destino, pareadas por um identificador comum. Isso garante saldo correto em ambas as contas.</> },
];
