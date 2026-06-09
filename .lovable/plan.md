# Seletor Global de Empresa (Multiempresa)

## Objetivo
Adicionar um seletor "Empresa Ativa" no topo do sistema que define o escopo de dados exibido em Financeiro, Comercial, Operação e BI. Permite visão **Consolidado** ou por uma das cinco empresas do Grupo Lundgaard Jensen.

## Empresas
| Código | Nome |
|---|---|
| `AD` | Lundgaard Jensen — Advocatício |
| `CO` | Lundgaard Jensen — Contábil |
| `AM` | Lundgaard Jensen — Ambiental |
| `IM` | Lundgaard Jensen — Imobiliária |
| `GE` | Lundgaard Jensen — Gestão |
| `__all__` | Consolidado (padrão) |

Os códigos reaproveitam os mesmos prefixos já usados na numeração de Devis (`AM`, `CO`, `IM`, `GE`) e adicionam `AD` para Advocatício.

## Mudanças

### 1. Contexto global (`src/contexts/CompanyContext.tsx` — novo)
- Provider com `activeCompany: CompanyCode | "__all__"`, `setActiveCompany`, `companies` (lista fixa), `isConsolidated`.
- Persistência em `localStorage` (`lj.activeCompany`). Default = `__all__`.
- Hook `useCompany()`.
- Adicionado dentro de `AuthProvider` em `src/routes/__root.tsx` para ficar disponível em toda árvore autenticada.

### 2. Seletor no header (`src/components/AppLayout.tsx`)
- Adicionar `<CompanySelector />` à direita do `SidebarTrigger`.
- Componente novo `src/components/CompanySelector.tsx`: `Select` (shadcn) com badge "Consolidado" colorido quando ativo, ícone `Building2`. Mostra nome completo no trigger.
- Visível em todas as telas autenticadas → "exibir claramente a empresa ativa".

### 3. Integração com as telas
Adicionar filtro `business_unit` (texto) nas queries existentes, condicionalmente quando `!isConsolidated`. **Incluir `activeCompany` na `queryKey`** para refetch automático ao trocar empresa.

- **Financeiro**
  - `src/routes/_authenticated/financeiro.central.tsx` — adicionar `.eq("business_unit", code)` (já existe filtro manual `business`, sobrepor quando empresa ativa).
  - `src/routes/_authenticated/financeiro.contas-a-pagar.tsx`, `financeiro.contas-a-receber.tsx`, `financeiro.rapport.tsx` — mesmo filtro em `financial_entries.business_unit`.
- **Comercial** (`comercial.tsx`)
  - `devis`: `.eq("business_unit", code)`.
  - `clients`: filtrar via `clients.business_unit_id` casando com `business_units.code = activeCompany` (subquery/in) — se a tabela `business_units` estiver vazia, ignorar filtro de clientes (consolidado de fato) e filtrar só devis. *Sem migrações de dados nesta etapa.*
- **Operação** (`operacao.tsx`)
  - `services.business_unit = code`.
- **BI** (`BIComercial.tsx`, `BIFinanceiro.tsx`)
  - Pré-selecionar `filters.bu = code` quando empresa ativa; ocultar/desabilitar o seletor interno de BU (redundante) e mostrar chip "Filtrado por: <empresa>".
  - `BIOperacao` (se existir endpoint) — passar `business_unit` como filtro.

### 4. Defaults em criação
Quando uma empresa específica está ativa, pré-preencher `business_unit` nos diálogos:
- `NovoLancamentoDialog`, `NovoProcessoDialog`, criação de Devis (`DevisCodePreviewDialog`).
- Não bloquear edição — usuário pode trocar.

### 5. Indicador visual
- Header: nome curto da empresa (ex.: "Advocatício") + badge "Consolidado" quando aplicável.
- Em páginas-chave (Financeiro, Comercial, Operação, BI), exibir uma pequena barra "Visualizando: <Empresa>" abaixo do título da página.

## Fora do escopo
- Sem migrações SQL (códigos vivem no front; `business_unit` continua texto livre nas tabelas).
- Sem alterar RLS, regras de negócio, numeração de Devis, ou geração de faturas.
- Sem multi-tenant real (não isola por `tenant_id`); apenas filtro de visualização.
- Sem alterar telas de admin/ajuda.

## Detalhes técnicos
```ts
// src/contexts/CompanyContext.tsx
export type CompanyCode = "AD" | "CO" | "AM" | "IM" | "GE";
export const COMPANIES: { code: CompanyCode; name: string; short: string }[] = [
  { code: "AD", name: "Lundgaard Jensen — Advocatício", short: "Advocatício" },
  { code: "CO", name: "Lundgaard Jensen — Contábil",   short: "Contábil"   },
  { code: "AM", name: "Lundgaard Jensen — Ambiental",  short: "Ambiental"  },
  { code: "IM", name: "Lundgaard Jensen — Imobiliária",short: "Imobiliária"},
  { code: "GE", name: "Lundgaard Jensen — Gestão",     short: "Gestão"     },
];
```

Padrão de uso em queries:
```ts
const { activeCompany, isConsolidated } = useCompany();
useQuery({
  queryKey: ["devis-list", filters, activeCompany],
  queryFn: async () => {
    let q = supabase.from("devis").select(...);
    if (!isConsolidated) q = q.eq("business_unit", activeCompany);
    return q;
  },
});
```

## Arquivos afetados
- **Novos**: `src/contexts/CompanyContext.tsx`, `src/components/CompanySelector.tsx`, `src/components/ActiveCompanyBanner.tsx`.
- **Editados**: `src/routes/__root.tsx`, `src/components/AppLayout.tsx`, `comercial.tsx`, `operacao.tsx`, `financeiro.central.tsx`, `financeiro.contas-a-pagar.tsx`, `financeiro.contas-a-receber.tsx`, `financeiro.rapport.tsx`, `BIComercial.tsx`, `BIFinanceiro.tsx`, `NovoLancamentoDialog.tsx`, `NovoProcessoDialog.tsx`, `DevisCodePreviewDialog.tsx`.
