CREATE OR REPLACE FUNCTION public.financeiro_summary(
  _competence text DEFAULT NULL,
  _business text DEFAULT NULL,
  _search text DEFAULT NULL,
  _bank uuid DEFAULT NULL,
  _type text DEFAULT NULL,
  _status text DEFAULT NULL,
  _origin text DEFAULT NULL,
  _realized text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT * FROM public.financial_entries fe
    WHERE (_competence IS NULL OR fe.competence_month = _competence)
      AND (_business IS NULL OR fe.business_unit = _business)
      AND (_bank IS NULL OR fe.bank_account_id = _bank)
      AND (_type IS NULL OR fe.entry_type::text = _type)
      AND (_status IS NULL OR fe.conciliation_status::text = _status)
      AND (_search IS NULL OR fe.movement_description ILIKE '%'||_search||'%' OR fe.counterparty_name ILIKE '%'||_search||'%')
      AND (_origin IS NULL
        OR (_origin='transferência' AND fe.entry_type::text='transferencia')
        OR (_origin='ofx' AND fe.source_type::text IN ('ofx','extrato'))
        OR (_origin='comercial' AND fe.document_reference IS NOT NULL AND fe.entry_type::text<>'transferencia')
        OR (_origin='manual' AND fe.source_type::text='manual' AND fe.document_reference IS NULL))
      AND (_realized IS NULL
        OR (_realized='previsto' AND fe.conciliation_status::text='pendente')
        OR (_realized='realizado' AND fe.conciliation_status::text<>'pendente'))
  ),
  rec AS (SELECT * FROM base WHERE entry_type::text = 'receita'),
  des AS (SELECT * FROM base WHERE entry_type::text = 'despesa'),
  agg_rec AS (
    SELECT
      COALESCE(SUM(COALESCE(total_brl, amount_in, 0)),0)::numeric AS prev_in,
      COALESCE(SUM(COALESCE(paid_amount,0)),0)::numeric AS recebido,
      COALESCE(SUM(COALESCE(open_amount, GREATEST(COALESCE(total_brl, amount_in, 0) - COALESCE(paid_amount,0), 0))),0)::numeric AS aberto_in
    FROM rec
  ),
  agg_des AS (
    SELECT
      COALESCE(SUM(COALESCE(total_brl, amount_out, 0)),0)::numeric AS prev_out,
      COALESCE(SUM(COALESCE(paid_amount,0)),0)::numeric AS pago,
      COALESCE(SUM(COALESCE(open_amount, GREATEST(COALESCE(total_brl, amount_out, 0) - COALESCE(paid_amount,0), 0))),0)::numeric AS aberto_out
    FROM des
  ),
  transfers AS (
    SELECT COALESCE(SUM(COALESCE(amount_in,0)+COALESCE(amount_out,0)),0)::numeric AS transfers
    FROM base WHERE entry_type::text='transferencia'
  ),
  conciliado AS (
    SELECT COALESCE(SUM(COALESCE(amount_in,0) - COALESCE(amount_out,0)),0)::numeric AS saldo_banco
    FROM base
    WHERE conciliation_status::text = 'conciliado'
      AND COALESCE(entry_type::text,'') <> 'transferencia'
  ),
  pend AS (
    SELECT
      COUNT(*) FILTER (WHERE conciliation_status::text='pendente')::bigint AS pendentes,
      COUNT(*) FILTER (WHERE conciliation_status::text='divergente')::bigint AS divergentes
    FROM public.bank_statement_entries
  )
  SELECT jsonb_build_object(
    'previstoIn',     agg_rec.prev_in,
    'previstoOut',    agg_des.prev_out,
    'recebido',       agg_rec.recebido,
    'pago',           agg_des.pago,
    'abertoIn',       agg_rec.aberto_in,
    'abertoOut',      agg_des.aberto_out,
    'saldoBanco',     conciliado.saldo_banco,
    'pendConcCount',  pend.pendentes,
    'divConcCount',   pend.divergentes,
    -- compatibilidade com chamadores antigos
    'saldoInicial',   0,
    'totalIn',        agg_rec.recebido,
    'totalOut',       agg_des.pago,
    'transfers',      transfers.transfers,
    'saldoFinal',     agg_rec.recebido - agg_des.pago,
    'disponivel',     agg_rec.recebido - agg_des.pago,
    'entries_count',  (SELECT COUNT(*) FROM base)
  )
  FROM agg_rec, agg_des, transfers, conciliado, pend;
$function$;