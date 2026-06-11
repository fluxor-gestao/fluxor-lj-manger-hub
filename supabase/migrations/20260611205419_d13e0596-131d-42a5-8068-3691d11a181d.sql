CREATE TABLE public.system_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  release_name TEXT NOT NULL,
  summary TEXT,
  implementations TEXT[] DEFAULT '{}',
  fixes TEXT[] DEFAULT '{}',
  visual_improvements TEXT[] DEFAULT '{}',
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_versions TO authenticated;
GRANT ALL ON public.system_versions TO service_role;

-- Enable RLS
ALTER TABLE public.system_versions ENABLE ROW LEVEL SECURITY;

-- Simple policy for authenticated users to read versions
CREATE POLICY "Users can view system versions" ON public.system_versions FOR SELECT TO authenticated USING (true);

-- Insert current version data
INSERT INTO public.system_versions (version, release_date, release_name, summary, implementations, fixes, visual_improvements, is_current)
VALUES (
  '1.2.0', 
  '2026-06-11', 
  'Central do CEO & DRE Gerencial', 
  'Grande atualização focada em inteligência financeira e visão executiva para o grupo.', 
  ARRAY[
    'Nova Central do CEO com KPIs financeiros e comerciais unificados',
    'DRE Gerencial automatizada com base no novo Plano de Contas',
    'Sistema de Importação Histórica para migração de planilhas (Excel/CSV)',
    'Novo Plano de Contas Gerencial com grupos e subcontas oficiais',
    'Módulo de Conciliação Financeira integrado ao Plano de Contas',
    'Sistema de alertas gerenciais automáticos (inadimplência, margem)',
    'Registro de logs de importação com auditoria completa'
  ],
  ARRAY[
    'Correção na área de clique dos cards de importação (overlay nativo)',
    'Sincronização de dados históricos com os novos dashboards de gestão',
    'Ajuste na navegação e permissões de acesso ao módulo Gestão'
  ],
  ARRAY[
    'Nova interface executiva para o Módulo de Gestão',
    'Cards de KPI com indicadores de tendência e subvalores',
    'Interface de preview de importação com validação de colunas',
    'Estilização premium dos cards de Importação Histórica'
  ],
  true
);

INSERT INTO public.system_versions (version, release_date, release_name, summary, implementations, fixes, visual_improvements, is_current)
VALUES (
  '1.1.12', 
  '2026-06-11', 
  'Otimização e Limpeza de Dados', 
  'Atualização focada na integridade da base de dados e melhorias no sistema de enriquecimento de informações corporativas.', 
  ARRAY[
    'Busca de localização inteligente para empresas internacionais',
    'Priorização de fontes oficiais (Receita Federal) para consultas via CNPJ',
    'Detecção automática de empresas estrangeiras no enriquecimento',
    'Sistema de migração de vínculos para limpeza de duplicatas'
  ],
  ARRAY[
    'Limpeza profunda da base de clientes removendo duplicatas',
    'Consolidação de propostas e serviços em registros únicos de clientes',
    'Correção no envio de propostas (validação flexível de cláusulas)'
  ],
  ARRAY[
    'Indicador de processamento (loader) ao refinar propostas',
    'Interface de enriquecimento de localização atualizada com status de país'
  ],
  false
);