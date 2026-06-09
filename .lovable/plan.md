# Área Principal (Centro de Resultado) por Devis

## Objetivo
Cada Devis passa a ter, além da **Empresa Responsável**, uma **Área Principal** obrigatória, escolhida a partir do catálogo da empresa selecionada. Visível na listagem, no detalhe, nos filtros e preparada para reutilização em Operação, Financeiro e BI.

## Catálogo de áreas (front-end, fixo)
Novo arquivo `src/lib/businessAreas.ts` com mapa `CompanyCode → Area[]`:

| Empresa | Áreas |
|---|---|
| `DE` Advocatício | Migratório, Civil, Contencioso, Consultivo |
| `AM` Ambiental | Topografia, Licenciamento, Regularização |
| `CO` Contábil | Fiscal, Contábil, Departamento Pessoal |
| `IM` Imobiliária | Venda de Imóveis, Regularização Imobiliária, Administração de Imóveis |
| `GE` Gestão | Consultoria, BPO Financeiro, Planejamento |

Cada área = `{ slug: string; label: string }` (ex.: `migratorio` / "Migratório"). Helpers: `getAreasFor(code)`, `findArea(code, slug)`, `AREA_BADGE_CLASS` (paleta neutra com tonalidade derivada da empresa).

## Armazenamento (sem migração)
Reutiliza a coluna existente `devis.responsible_sector` (texto livre hoje) para gravar o **slug** da área. Vantagens:
- zero migração SQL nesta etapa;
- já é lida por Operação (`services.responsible_sector` é copiada do Devis no trigger `devis_accepted_create_service`);
- listagem/detalhe atuais continuam compatíveis (a UI renderiza o `label` a partir do slug).

Migração SQL e tabela própria de áreas ficam **fora do escopo** desta etapa (preparação apenas estrutural).

## Mudanças

### 1. Novo: `src/lib/businessAreas.ts`
Catálogo + helpers + tipo `AreaSlug`.

### 2. Novo: `src/components/AreaBadge.tsx`
Badge compacta `Building → Área` (ícone `Layers`) usando classes neutras; aceita `companyCode` + `areaSlug` e cai para "—" quando ausente.

### 3. `src/routes/_authenticated/comercial.tsx` (criar Devis)
- Substituir o input livre de "Setor responsável" por um `<Select>` populado por `getAreasFor(form.business_unit)`.
- Desabilitado enquanto `business_unit` não estiver selecionada; resetar `responsible_sector` quando a empresa muda.
- Validação: bloquear `createDevis` quando `responsible_sector` vazio (mensagem "Selecione a área principal").
- Listagem: nova coluna **Área** (após "Empresa") com `<AreaBadge>`.
- Filtros: novo `filterArea` (`"all" | slug`), dependente de `filterCompany`/`companyCode`; aplica `q.eq("responsible_sector", slug)` na query paginada e no filtro client-side.
- Pré-preenchimento via ATA (`handleCodeConfirmed`): se `payload.devis.responsible_sector` casar com um slug válido da empresa, manter; senão, deixar vazio e exigir seleção manual.

### 4. `src/routes/_authenticated/comercial_.devis.$id.tsx` (detalhe/edição)
- Header: exibir `<AreaBadge>` ao lado do `<CompanyBadge>`.
- Bloco "Escopo": trocar o `<Input>` de "Setor responsável" por `<Select>` com as áreas da empresa atual; bloquear save quando vazio.
- Em modo leitura: mostrar o `label` (não o slug).
- Reset de área ao trocar empresa em edição.

### 5. `src/components/operacao/OperacaoFilters.tsx` + `operacao.tsx`
- O filtro existente "Setor" passa a usar `getAreasFor(companyCode)` quando uma empresa está ativa; em modo Consolidado, mostra a união de áreas com prefixo da empresa (`Advocatício · Civil`). Renderização do badge no Kanban/Lista usa `<AreaBadge>`.
- Sem mudança no schema de `services`.

### 6. Preparação para Financeiro/BI (somente estrutura)
- Exportar `AREA_SLUGS_BY_COMPANY` em `businessAreas.ts` para reutilização futura nos selects de `NovoLancamentoDialog` e nos filtros de `BIComercial`/`BIFinanceiro`.
- **Nenhuma alteração** nesses módulos nesta etapa.

## Fora do escopo
- Migração SQL / tabela `business_areas` / FKs.
- Rateio entre áreas.
- Filtros de área em Financeiro/BI (apenas estrutura preparada).
- Edição do catálogo via UI admin.

## Arquivos
- **Novos**: `src/lib/businessAreas.ts`, `src/components/AreaBadge.tsx`.
- **Editados**: `src/routes/_authenticated/comercial.tsx`, `src/routes/_authenticated/comercial_.devis.$id.tsx`, `src/components/operacao/OperacaoFilters.tsx`, `src/components/operacao/OperacaoKanban.tsx` e `OperacaoLista.tsx` (apenas para usar `<AreaBadge>` onde hoje mostra `responsible_sector` cru).
