## Objetivo

Após a tela "3. Análise IA" do `UploadAtaDialog`, abrir a tela de escolha de **código do Devis (prefixo GE/CO/AM/IM/DE + sequencial)** que já existe (`DevisCodePreviewDialog`). Só depois da confirmação dessa tela é que o rascunho é criado e o usuário é redirecionado para a tela de estrutura geral (fluxo atual).

Nada do fluxo existente é removido — apenas inserimos uma etapa entre o que já roda hoje.

## Mudanças

### 1. `src/components/devis/UploadAtaDialog.tsx`
- Acrescentar estado `pendingResult: ConfirmedAtaResult | null` e `showCodeDialog: boolean`.
- No final de `handleAnalyze` (e no `handleConfirm` do step 4), **substituir** a chamada direta `onConfirm({ client_id, payload })` por:
  - guardar `{ client_id, payload }` em `pendingResult`
  - abrir o `DevisCodePreviewDialog` (`showCodeDialog = true`)
- Importar `DevisCodePreviewDialog` + `inferServicePrefix` e renderizá-lo dentro do componente. `initialPrefix` é calculado a partir de `payload.devis.service_type / responsible_sector / title / scope_description` (mesma lógica que hoje vive no parent).
- No `onConfirm` do `DevisCodePreviewDialog`, chamar `props.onConfirm({ ...pendingResult, devis_code: { prefix, devis_number, service_type } })` e fechar tudo.
- Atualizar o breadcrumb visual do dialog para refletir a nova etapa, sem quebrar layout: `1. Upload → 2. Confirmação → 3. Análise IA → 4. Código → 5. Revisão` (o step 5 continua sendo o fallback atual de revisão manual, hoje numerado como 4).

### 2. `src/components/devis/UploadAtaDialog.tsx` – tipo
- Estender `ConfirmedAtaResult` com campo opcional:
  ```ts
  devis_code?: { prefix: string; devis_number: string; service_type: string }
  ```

### 3. `src/routes/_authenticated/comercial.devis.tsx` – `handleAtaConfirm`
- Se `result.devis_code` estiver presente: pular `inferServicePrefix` e `supabase.rpc("next_devis_number")` e usar os valores escolhidos pelo usuário (`prefix`, `devis_number`, `service_type`) na montagem do `insertPayload`.
- Se ausente (segurança / compatibilidade): manter o caminho atual exatamente como está.

### 4. Versionamento
- Após a alteração, chamar `supabase.rpc('log_change', { _type: 'ajuste', _description: 'Upload de Ata: reinserida etapa de escolha do código do Devis (prefixo + sequencial) antes de criar o rascunho' })`.

## O que NÃO muda
- `DevisCodePreviewDialog` permanece intacto (já tem seletor de prefixo, próximo sequencial editável e preview do código).
- Toda a criação do Devis, inserção de áreas, redirect para `comercial/devis/:id`, e as telas "Estrutura geral" continuam idênticas.
- O fallback do step "Revisão" (quando a IA não consegue resolver cliente) continua funcionando — apenas passa pelo novo step de código antes de finalizar.
