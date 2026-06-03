# Acesso por módulo (papéis de usuário)

## Situação atual
- Já existe o enum `app_role` (`admin`, `comercial`, `financeiro`, `operacao`, `gestao`, `gerencial`, `bi_viewer`) e a tabela `user_roles` com `has_role()`.
- `AuthContext` carrega os papéis do usuário logado e expõe `hasRole()`.
- `src/lib/access.ts` + `AccessGuard` já bloqueiam rotas por papel; `AppSidebar` esconde itens.
- Hoje `/admin` (Opções/Usuários) está restrito a `admin` → usuários "comercial" já não enxergam.
- **Lacuna:** a página `/bi` mostra os 3 dashboards (Comercial, Financeiro, Operação) para qualquer papel; não há filtro por módulo.

## O que muda

### 1. Matriz de acesso refinada (`src/lib/access.ts`)
- Manter `/comercial` → `comercial`, `/financeiro` → `financeiro`, `/operacao` → `operacao`.
- `/bi` continua acessível a `comercial`, `financeiro`, `operacao`, mas cada dashboard interno passa a ter papel próprio:
  - `bi:comercial` → `comercial`
  - `bi:financeiro` → `financeiro`
  - `bi:operacao` → `operacao`
- Adicionar helper `canAccessBiDashboard(id, hasRole)`.

### 2. Página `/bi` filtrada
- Em `src/routes/_authenticated/bi.tsx`, filtrar `dashboards` pelo `hasRole` antes de renderizar os cards.
- Se o usuário tiver acesso a apenas 1 dashboard, abrir direto nele (skip da grade).
- Bloquear `selectedDashboard` por `AccessGuard`-like check (mensagem "Acesso restrito" se tentar acessar por URL/state indevido).

### 3. Sidebar coerente
- `AppSidebar` já esconde "Opções" para não-admin. Confirmar que itens "Comercial/Financeiro/Operação" também respeitam `hasRole` (ajustar se faltar).

### 4. Tela de gestão de usuários (`/admin`)
- Permitir ao admin atribuir múltiplos papéis a um usuário (ex.: só `comercial`, ou `comercial`+`financeiro`).
- Já existe a tabela; falta apenas conferir/expor a UI de marcação por checkbox de papéis no editor de usuário (verificar `admin.tsx` na implementação).

### 5. Backend (RLS)
- Sem nova migration necessária neste passo — as policies já usam `has_role()` e o enum cobre os papéis.
- (Opcional futuro) papéis adicionais como `bi_viewer` ficam disponíveis para perfis "somente leitura BI".

## Resultado para o usuário
- Criar um usuário com apenas o papel `comercial` resulta em: vê só **Comercial**, **BI → Dashboard Comercial** e **Ajuda**; não vê Financeiro, Operação, Conciliação, Gestão, Opções/Usuários, nem os outros dashboards de BI.

## Próximos passos
Implementar 1–4 (sem migration). Caso queira papéis mais granulares (ex.: "BI viewer comercial sem CRUD comercial"), criar uma segunda rodada introduzindo `bi_comercial`, `bi_financeiro`, `bi_operacao` como papéis dedicados.
