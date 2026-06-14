UPDATE public.devis
   SET status = 'pronta_para_envio', updated_at = now()
 WHERE is_fa = true
   AND status NOT IN ('enviada_ao_cliente','entrada_recebida');

SELECT public.log_change(
  'ajuste',
  'FAs no Comercial agora iniciam corretamente em "Pronta para envio" assim que geradas na Operação.'
);