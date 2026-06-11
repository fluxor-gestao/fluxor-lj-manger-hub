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
  version: "1.0.0",
  releaseDate: "10/06/2026",
  releaseName: "Base Comercial e Financeira",
};

export const versionHistory: VersionRelease[] = [
  {
    version: "1.0.0",
    releaseDate: "10/06/2026",
    releaseName: "Base Comercial e Financeira",
    summary: "Lançamento inicial da plataforma com módulos principais de gestão comercial e financeira.",
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

