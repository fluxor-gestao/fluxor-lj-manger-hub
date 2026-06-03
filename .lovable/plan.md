
# Testes End-to-End — Supabase `uxwdzcjhrhlugrjgpkcr`

Todos os registros marcados com sufixo `__QA_E2E__` para limpeza determinística no final.

## Sequência

### 1. Comercial (SQL via supabase--read_query/migration tool)
- INSERT `clients` (`name='QA Cliente __QA_E2E__'`, `business_unit_id=NULL`, `type='PJ'`, email teste) → guardar `client_id`.
- UPDATE no client (mudar telefone) → confirmar `updated_at` mudou.
- INSERT `devis` (`title='QA Devis __QA_E2E__'`, `client_id`, `total_amount=10000`, `service_type='ambiental'`) → confirmar `devis_number` gerado (`AM…`), `down_payment_amount=5000` (trigger `calc_devis_down_payment`).
- UPDATE setando flags de validação (`validation_*_confirmed=true`) → confirmar status avançou (trigger `devis_status_progression`).
- UPDATE setando `accepted_at=now()` → dispara `devis_accepted_create_service` + `trg_devis_accepted_charge`.

### 2. Automações
- SELECT `services` WHERE `devis_id=` → confirmar 1 linha criada.
- SELECT `financial_entries` WHERE `document_reference=<devis_id>` → confirmar 1 linha, `amount_in=5000`, `entry_type='receita'`, `conciliation_status='pendente'`.
- Confirmar `initial_charge_generated=true` no devis.

### 3. Financeiro
- INSERT `financial_entries` manual extra (`movement_description='QA Lançamento __QA_E2E__'`, `amount_in=1234.56`, `entry_date=hoje`, `competence_month=YYYY-MM`).
- SELECT verificando soma e listagem.
- Executar `financeiro_summary(_competence=>'<mes>')` → validar `previstoIn` ≥ 6234.56 (devis 5000 + manual 1234.56).

### 4. Storage `devis-pdfs`
- Via service role (CLI curl com `SUPABASE_SERVICE_ROLE_KEY` se disponível; se não, usar `code--exec` chamando a REST API do Storage com a key listada no Project Secrets — vou conferir disponibilidade no runtime). Caso a key não esteja exposta ao shell, faço upload via uma serverFn temporária OU pulo e reporto.
- Upload `qa-test.pdf` (PDF mínimo gerado em /tmp).
- Gerar signed URL (60s) e baixar via curl → checar 200 + content-type.
- Delete do arquivo.

### 5. BI
- `SELECT bi_kpis_comercial(NULL,NULL)` → verificar `total_devis>=1`, `accepted>=1`, `accepted_amount>=10000`.
- `SELECT bi_kpis_operacao(NULL,NULL)` → `total_services>=1`.
- `SELECT financeiro_summary()` → confirmar entrada prevista.
- Endpoint `/api/public/bi-kpis-financeiro` agregado (sem token → 401 esperado; com smoke pelo SQL direto).

### 6. Limpeza
Ordem reversa para respeitar dependências (sem FKs declaradas, mas mesmo assim):
1. DELETE `financial_entries` WHERE `document_reference=<devis_id>` OR `movement_description ILIKE '%__QA_E2E__%'`.
2. DELETE `services` WHERE `devis_id=<devis_id>`.
3. DELETE `devis` WHERE `id=<devis_id>`.
4. DELETE `clients` WHERE `id=<client_id>`.
5. DELETE objeto Storage (`qa-test.pdf`) — já feito na §4.
6. SELECT final confirmando counts voltaram a 0.

## Entregável
- Tabela OK/Erro por item.
- IDs criados + IDs removidos.
- Output dos KPIs antes/depois.
- Saídas de erro (se houver).

## Notas
- Não toco em schema, migrations, layout, regras.
- INSERT/UPDATE/DELETE de teste serão executados via `supabase--migration` (tool requer aprovação automática) ou `supabase--read_query` se vier permitido — caso contrário paro e peço a aprovação a você.
- Storage upload depende do `SUPABASE_SERVICE_ROLE_KEY` estar acessível no runtime do sandbox. Se indisponível, reporto e pulo só esse passo.
