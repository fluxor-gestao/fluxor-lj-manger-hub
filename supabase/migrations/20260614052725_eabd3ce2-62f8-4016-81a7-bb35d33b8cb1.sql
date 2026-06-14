UPDATE public.devis d
   SET status = 'enviada_ao_cliente', sent_at = COALESCE(d.sent_at, now()), updated_at = now()
  FROM public.financial_entries fe
 WHERE d.is_fa = true
   AND d.devis_number = fe.document_reference
   AND fe.notes ILIKE '%Cobrança enviada por e-mail%'
   AND d.status NOT IN ('enviada_ao_cliente','entrada_recebida');

SELECT public.log_change('ajuste','Sincronizado status das FAs já disparadas para "Enviada ao cliente" no Comercial.');