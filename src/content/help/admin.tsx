import { type HowToItem } from "@/components/help/HowToAccordion";
import { type FAQItem } from "@/components/help/HelpFAQ";

export const adminOverview = [
  "Admin concentra a configuração do sistema: usuários, papéis, unidades de negócio, configurações gerais, versão, changelog, diagnóstico, sequência de propostas, API keys e backup completo dos dados.",
  "Quem opera: apenas usuários com papel 'admin'. Demais usuários não veem o módulo.",
  "Toda alteração relevante é registrada no log de auditoria (audit_logs) e — quando aplicável — gera entrada de changelog com bump automático de versão.",
];

export const adminHowTo: HowToItem[] = [
  { id: "novo-usuario", question: "Como criar um novo usuário?",
    steps: [
      "Vá em Admin → aba 'Usuários'.",
      "Clique em 'Novo usuário'.",
      "Informe e-mail, nome e papéis (comercial / financeiro / operação / admin). Vários papéis por usuário são permitidos.",
      "O sistema cria a conta e envia convite por e-mail (definição de senha no primeiro acesso).",
    ] },
  { id: "papeis", question: "Como funcionam os papéis (roles)?",
    steps: [
      "Cada papel libera um módulo: comercial → Comercial, financeiro → Financeiro e Conciliação, operacao → Operação, admin → tudo + Gestão e Admin.",
      "Um usuário pode ter múltiplos papéis acumulados.",
      "Os papéis ficam na tabela 'user_roles' (separada do profile) por segurança — não armazenamos role no perfil.",
      "Mudanças de papel são imediatas: peça ao usuário fazer logout/login para atualizar a sessão.",
    ] },
  { id: "areas", question: "Como cadastrar unidades de negócio e setores responsáveis?",
    steps: [
      "Admin → aba 'Áreas de Negócio'.",
      "Cadastre BUs (unidades) com código e nome, e setores responsáveis vinculados.",
      "Esses cadastros alimentam todos os seletores do sistema (devis, financeiro, operação).",
    ] },
  { id: "config-sistema", question: "Como alterar dados da empresa, prefixos e termos das propostas?",
    steps: [
      "Admin → aba 'Configurações'.",
      "Edite razão social, documento, e-mails de suporte, prefixo de proposta, % de entrada, validade padrão, termos e template.",
      "Salve. As mudanças passam a valer nas próximas propostas geradas.",
    ] },
  { id: "changelog", question: "O que é o painel 'Alterações pendentes' e a versão automática?",
    steps: [
      "Toda alteração de código relevante (feita pela IA ou time) registra uma entrada em changelog_entries via RPC log_change.",
      "Cada entrada faz o bump automático do patch da versão (ex.: 1.2.33 → 1.2.34).",
      "Admin → 'Alterações pendentes' mostra a lista; em 'Versões' você vê o histórico completo.",
    ] },
  { id: "backup", question: "Como gerar um backup completo do sistema?",
    steps: [
      "Admin → aba 'Backup'.",
      "Clique em 'Gerar backup'.",
      "O sistema exporta todas as 44 tabelas públicas em CSV (paginado, 1000 linhas por vez), empacota num ZIP, redige campos sensíveis (api_keys mascaradas, profiles em campos seguros).",
      "Download é direto; uma entrada de auditoria é gravada.",
    ] },
  { id: "api-keys", question: "Como gerar uma API key?",
    steps: [
      "Admin → 'API Keys' (ou rota /admin/api-keys).",
      "Clique em 'Nova chave'. Informe nome, descrição, validade e ative.",
      "Copie a chave NO MOMENTO da criação — ela não é mostrada novamente.",
      "Use em integrações externas que chamem os endpoints /api/public/* da plataforma.",
    ] },
  { id: "diagnostico", question: "Onde vejo o diagnóstico do sistema?",
    steps: [
      "Admin → 'Diagnóstico do Sistema'.",
      "Mostra checagens: edge functions ativas, conexões, jobs pendentes, integrações externas.",
      "Use ao investigar lentidão ou comportamentos estranhos antes de chamar o time técnico.",
    ] },
  { id: "sequencia-devis", question: "Como ajustar a sequência de numeração de propostas?",
    steps: [
      "Admin → 'Sequência de Devis'.",
      "Veja o próximo número por prefixo (DE/AM/CO) e por mês/ano.",
      "Só altere em casos excepcionais (recuperação de migração). Alterar sequência rompe a numeração contínua.",
    ] },
];

export const adminFAQ: FAQItem[] = [
  { id: "sem-acesso", question: "Um usuário diz que não consegue acessar um módulo",
    answer: <>Confirme em Admin → Usuários que ele tem o papel correto e peça logout/login. A matriz de acesso por rota está documentada em src/lib/access.ts.</> },
  { id: "delete-usuario", question: "Como remover um usuário?",
    answer: <>Em Admin → Usuários, use a ação de excluir. Isso revoga papéis e bloqueia o acesso. Os dados criados por ele (devis, lançamentos) permanecem para histórico.</> },
  { id: "backup-grande", question: "O backup demorou muito ou falhou",
    answer: <>Tabelas grandes (lançamentos, audit_logs) podem demorar minutos. Se cair, tente de novo — a paginação é estável. Se persistir, veja os logs da edge function generate-system-backup.</> },
  { id: "versao", question: "Por que a versão pulou várias vezes num dia?",
    answer: <>Cada alteração de código registrada via log_change gera um bump de patch. Em dias de muito desenvolvimento, é comum subir várias versões. O histórico fica visível na aba Versões.</> },
];
