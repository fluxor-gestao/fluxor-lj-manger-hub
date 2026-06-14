## Diagnóstico

- `MultiAreaSelector` já lê de `business_areas` filtrando por `business_unit`, mas também faz merge com áreas legadas hardcoded em `src/lib/businessAreas.ts` (`BUSINESS_AREAS`). Isso polui as sugestões e quebra a regra de "tudo deve vir da tabela Áreas".
- A IA (`generate-devis-proposal`, `analyze-meeting-report`) devolve `responsible_sector(s)` em texto livre (ex.: "Advocacia Imobiliária", "Internacional"). Esses valores são gravados em `devis_service_areas.area_slug` como vieram, então:
  - se não baterem com um `slug` real de `business_areas`, eles **não aparecem marcados** no seletor da unidade (o usuário vê "Selecionar áreas..." mesmo com áreas já vinculadas);
  - badges no topo do Devis acabam mostrando rótulos "soltos" sem vínculo real com a unidade.
- Não há indicação visual de quais áreas foram **sugeridas pela IA** vs. selecionadas manualmente.

## O que vamos fazer

### 1. Seletor passa a ser 100% baseado em `business_areas`
`src/components/devis/MultiAreaSelector.tsx`
- Remover o merge com `getAreasFor(companyCode)`; usar apenas os registros ativos de `business_areas` da unidade.
- Mensagem clara quando `companyCode` está vazio: "Selecione a empresa para listar as áreas".
- Aceitar nova prop opcional `suggestedAreas?: string[]` para marcar visualmente itens vindos da IA (chip "Sugerida pela IA" na linha do popover).

### 2. Normalizar saídas da IA contra `business_areas`
Novo helper `src/lib/areaResolver.ts`:
- `resolveAreasForUnit(unit, rawList): Promise<{ valid: string[]; unknown: string[] }>`
- Busca `business_areas` (active, unit) e tenta casar cada item por: slug exato → label/name exato (normalizado) → `includes` parcial. Só retorna slugs presentes na tabela.

Aplicar em:
- `src/routes/_authenticated/comercial.devis.tsx` → `handleAtaConfirm`: antes de `insert` em `devis_service_areas`, passar `payload.devis.responsible_sectors` pelo resolver. Salvar **apenas slugs válidos**. Guardar a lista resolvida também em `devis.ai_suggested_area_slugs` (nova coluna).
- `src/routes/_authenticated/comercial_.devis.$id.tsx` → `handleGenerate`: ao receber sugestão da IA, resolver `responsible_sector(s)` contra a unidade do form e refletir no estado `aiSuggestions`/`selectedAreas` (pré-seleção, sem sobrescrever escolhas manuais já presentes).

### 3. Pré-seleção + abertura para alterar
- Na tela do Devis, ao entrar em edição, `selectedAreas` já vem de `devis_service_areas` (mantido). Adicional: passar `suggestedAreas={devis.ai_suggested_area_slugs ?? []}` ao `MultiAreaSelector` para o usuário ver "Sugerida pela IA" e ter liberdade de desmarcar / marcar outras da tabela.

### 4. Instruir a IA a escolher só do catálogo
- `supabase/functions/analyze-meeting-report/index.ts` e `supabase/functions/generate-devis-proposal/index.ts`: incluir no prompt a lista `slug — label` das áreas ativas da unidade e exigir que o modelo retorne **somente slugs dessa lista** em `responsible_sectors`. (Resolver na etapa 2 continua como rede de segurança.)

### 5. Migração de banco
- Adicionar `ai_suggested_area_slugs text[] NOT NULL DEFAULT '{}'::text[]` em `public.devis` (nullable opcional). Sem alterar políticas existentes.

### 6. Versionamento
- `supabase.rpc('log_change', { _type: 'ajuste', _description: 'Áreas Responsáveis do Devis: passam a vir exclusivamente da tabela business_areas, com sugestões da IA pré-selecionadas e validadas' })`.

## O que NÃO muda
- Tabela `business_areas` e a tela "Áreas" continuam intactas.
- `responsible_sector` (área principal singular) segue sendo o primeiro slug válido.
- `BUSINESS_AREAS` hardcoded é mantido em `businessAreas.ts` somente para `findArea`/`areaLabel` legados (badges de devis antigos), mas não é mais oferecido no seletor.
- Demais campos do Devis, fluxo de upload de Ata e tela de criação do código não são tocados.
