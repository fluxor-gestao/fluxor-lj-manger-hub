
-- IDs fixos para facilitar tracking/cleanup
DO $$
DECLARE
  v_client uuid := '11111111-1111-1111-1111-111111111111';
  v_devis  uuid := '22222222-2222-2222-2222-222222222222';
  v_fin    uuid := '33333333-3333-3333-3333-333333333333';
  v_admin  uuid := '8c1b845b-7b42-435d-8f91-01e68f8233aa';
  v_comp   text := to_char(now(),'YYYY-MM');
BEGIN
  -- 1. Cliente
  INSERT INTO public.clients (id, name, email, phone, type, document, notes)
  VALUES (v_client, 'QA Cliente __QA_E2E__', 'qa-e2e@example.com', '+5511999990000', 'PJ', '00.000.000/0001-00', 'registro teste');

  -- editar (dispara update_updated_at)
  PERFORM pg_sleep(0.2);
  UPDATE public.clients SET phone='+5511988887777' WHERE id=v_client;

  -- 2. Devis (rascunho) — service_type 'ambiental' → numeração AM
  INSERT INTO public.devis (id, client_id, title, total_amount, service_type, business_unit,
                            scope_description, deadline_date, created_by, source_language)
  VALUES (v_devis, v_client, 'QA Devis __QA_E2E__', 10000, 'ambiental', 'AMBIENTAL',
          'Escopo de teste E2E', CURRENT_DATE + 30, v_admin, 'pt');

  -- avançar validações (dispara devis_status_progression → pronta_para_envio)
  UPDATE public.devis SET
    validation_client_confirmed=true,
    validation_service_confirmed=true,
    validation_sector_defined=true,
    validation_amount_confirmed=true,
    validation_deadline_defined=true,
    validated_by=v_admin,
    validated_at=now()
  WHERE id=v_devis;

  -- enviar
  UPDATE public.devis SET status='enviada_ao_cliente', sent_at=now() WHERE id=v_devis;

  -- aceitar → dispara devis_accepted_create_service + trg_devis_accepted_charge
  UPDATE public.devis SET accepted_at=now(), accepted_ip='127.0.0.1', status='aceita' WHERE id=v_devis;

  -- 3. Lançamento financeiro manual extra
  INSERT INTO public.financial_entries (id, entry_date, competence_month, movement_description,
                                        counterparty_name, amount_in, amount_out, entry_type,
                                        source_type, conciliation_status, user_id)
  VALUES (v_fin, CURRENT_DATE, v_comp, 'QA Lançamento __QA_E2E__', 'QA Counterparty',
          1234.56, 0, 'receita', 'manual', 'pendente', v_admin);

  RAISE NOTICE 'QA_E2E seed OK';
END$$;
