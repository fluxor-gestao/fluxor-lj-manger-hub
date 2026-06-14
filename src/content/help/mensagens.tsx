import { type HowToItem } from "@/components/help/HowToAccordion";
import { type FAQItem } from "@/components/help/HelpFAQ";

export const mensagensOverview = [
  "Central de Mensagens é o chat interno do sistema: conversas diretas, grupos e contexto (chat preso a uma proposta/serviço).",
  "Mostra presença em tempo real (bolinha verde = online), suporte a anexos (até 10MB) e contagem de não-lidas no botão do header.",
  "Os usuários e mensagens são privados — Row Level Security garante que só participantes da conversa enxergam o conteúdo.",
];

export const mensagensHowTo: HowToItem[] = [
  { id: "abrir-chat", question: "Como abrir a Central de Mensagens?",
    steps: [
      "Clique no ícone de balão no topo (header) ou vá em /mensagens pelo menu.",
      "À esquerda você vê as abas 'Conversas' e 'Pessoas'.",
      "À direita, a conversa selecionada.",
    ] },
  { id: "dm", question: "Como falar diretamente com um usuário?",
    steps: [
      "Abra a aba 'Pessoas' na sidebar.",
      "Use a busca para encontrar o usuário (nome ou e-mail).",
      "Clique no usuário — o sistema cria (ou reabre) uma conversa direta com ele.",
      "Usuários online aparecem com bolinha verde e vêm primeiro na lista.",
    ] },
  { id: "nova-conversa", question: "Como criar uma nova conversa (incluindo grupo)?",
    steps: [
      "Clique no botão '+' no topo da sidebar de conversas.",
      "Escolha o tipo (direta ou grupo).",
      "Para grupo, selecione múltiplos participantes e dê um título.",
      "Salve. A conversa aparece no topo da lista.",
    ] },
  { id: "anexos", question: "Como enviar arquivos pelo chat?",
    steps: [
      "Dentro da conversa, clique no clipe (anexar).",
      "Selecione um ou mais arquivos (limite de 10MB por arquivo).",
      "Imagens mostram preview; outros arquivos viram links com download via URL assinada.",
      "Os anexos ficam no bucket privado chat-attachments, acessíveis apenas aos participantes da conversa.",
    ] },
  { id: "contexto", question: "O que é uma conversa de contexto (vinculada a proposta/serviço)?",
    steps: [
      "Em telas como Devis ou Serviço, existe um botão 'Conversar sobre' que abre/cria uma conversa atrelada àquele registro.",
      "Essa conversa aparece na lista com o rótulo do contexto (ex.: 'DE202605003 — Cliente X').",
      "Útil para discussões focadas, sem se misturar com outras pautas.",
    ] },
  { id: "marcar-lidas", question: "Como ficam as mensagens não-lidas?",
    steps: [
      "O botão do header mostra um badge com o total de não-lidas em todas as conversas.",
      "Na sidebar, cada conversa com pendência tem o contador próprio.",
      "Abrir a conversa marca como lida automaticamente.",
      "Use o filtro 'Não-lidas' no topo da sidebar para isolar pendências.",
    ] },
];

export const mensagensFAQ: FAQItem[] = [
  { id: "presenca", question: "A bolinha verde está atrasada — o usuário saiu mas continua online",
    answer: <>A presença é atualizada via canal realtime e tem um pequeno atraso (segundos) ao perder conexão. Se persistir minutos, o usuário pode ter fechado o navegador sem logout — normal.</> },
  { id: "arquivo-grande", question: "Tentei enviar arquivo grande e deu erro",
    answer: <>O limite é 10MB por arquivo (limitação do bucket chat-attachments). Para arquivos maiores, suba em outro lugar (Drive, anexo de processo) e cole o link.</> },
  { id: "ver-tudo", question: "Posso ver mensagens entre outros usuários?",
    answer: <>Não. As políticas de RLS restringem leitura aos participantes de cada conversa. Nem admins veem o conteúdo de chats que não fazem parte.</> },
  { id: "deletar", question: "Posso apagar uma mensagem?",
    answer: <>Hoje não há exclusão de mensagem pelo usuário final. Para casos sensíveis, peça ao admin via auditoria.</> },
];
