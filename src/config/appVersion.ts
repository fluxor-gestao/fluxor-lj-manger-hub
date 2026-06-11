export interface VersionRelease {
  version: string;
  releaseDate: string;
  releaseName: string;
  summary: string;
  implementations: string[];
  fixes: string[];
  visualImprovements: string[];
}

export const appVersion = {
  version: "1.1.12",
  releaseDate: "11/06/2026",
  releaseName: "Otimização e Limpeza de Dados",
};

export const versionHistory: VersionRelease[] = [
  {
    version: "1.1.12",
    releaseDate: "11/06/2026",
    releaseName: "Otimização e Limpeza de Dados",
    summary: "Atualização focada na integridade da base de dados e melhorias no sistema de enriquecimento de informações corporativas.",
    implementations: [
      "Busca de localização inteligente para empresas internacionais",
      "Priorização de fontes oficiais (Receita Federal) para consultas via CNPJ",
      "Detecção automática de empresas estrangeiras no enriquecimento",
      "Sistema de migração de vínculos para limpeza de duplicatas"
    ],
    fixes: [
      "Limpeza profunda da base de clientes removendo duplicatas",
      "Consolidação de propostas e serviços em registros únicos de clientes",
      "Correção no envio de propostas (validação flexível de cláusulas)"
    ],
    visualImprovements: [
      "Indicador de processamento (loader) ao refinar propostas",
      "Interface de enriquecimento de localização atualizada com status de país"
    ]
  },
  {
    version: "1.0.8",
    releaseDate: "11/06/2026",
    releaseName: "Base Comercial e Financeira",
    summary: "Lançamento inicial consolidado da plataforma com módulos de gestão comercial, financeira e ferramentas administrativas avançadas.",
    implementations: [
      "Cadastro de clientes centralizado com geolocalização",
      "Fluxo completo de Devis (Propostas Comerciais)",
      "Gestão de Contas a Receber com faturamento",
      "Central Financeira para controle de lançamentos",
      "Módulo de Áreas e Unidades de Negócio",
      "Dashboard de BI Comercial e Financeiro"
    ],
    fixes: [
      "Padronização do código comercial do Devis (ex: DE202606001)",
      "Correção no filtro de cobranças pendentes no financeiro",
      "Ajuste no cálculo automático de entrada e saldo no Devis"
    ],
    visualImprovements: [
      "Interface corporativa premium baseada no guia de estilo LJ",
      "Dashboards simplificados e mais executivos",
      "Novo fluxo de upload de Ata/Plaud com barra de progresso"
    ]
  }
];

