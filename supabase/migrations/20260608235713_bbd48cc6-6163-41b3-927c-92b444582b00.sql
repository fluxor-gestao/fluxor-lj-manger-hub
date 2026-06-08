
CREATE OR REPLACE FUNCTION public.next_devis_number(_prefix text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE ym text; next_seq int; pfx text;
BEGIN
  pfx := upper(coalesce(_prefix,'DE'));
  IF pfx NOT IN ('DE','AM','CO','IM','GE') THEN pfx := 'DE'; END IF;
  ym := to_char(now(),'YYYYMM');
  SELECT COALESCE(MAX(CAST(SUBSTRING(devis_number FROM (length(pfx)+7)) AS INT)),0)+1
    INTO next_seq FROM public.devis WHERE devis_number LIKE pfx||ym||'%';
  RETURN pfx||ym||lpad(next_seq::text,3,'0');
END; $function$;

CREATE OR REPLACE FUNCTION public.generate_devis_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE prefix text; st text; next_seq int; ym text;
BEGIN
  IF NEW.devis_number IS NOT NULL AND NEW.devis_number<>'' THEN RETURN NEW; END IF;
  st := lower(coalesce(NEW.service_type,''));
  IF st ~ '(ambient|environment|ambiental)' THEN prefix:='AM';
  ELSIF st ~ '(cont[áa]bil|cont[aá]bei|accounting|fiscal|tribut)' THEN prefix:='CO';
  ELSIF st ~ '(imobili[áa]rio|imobili[áa]ria|real estate|im[óo]vel|im[óo]veis)' THEN prefix:='IM';
  ELSIF st ~ '(gest[ãa]o|management|administra[çc][ãa]o|consultoria)' THEN prefix:='GE';
  ELSE prefix:='DE'; END IF;
  ym := to_char(coalesce(NEW.created_at,now()),'YYYYMM');
  SELECT COALESCE(MAX(CAST(SUBSTRING(devis_number FROM (length(prefix)+7)) AS INT)),0)+1
    INTO next_seq FROM public.devis WHERE devis_number LIKE prefix||ym||'%';
  NEW.devis_number := prefix||ym||lpad(next_seq::text,3,'0');
  RETURN NEW; END; $function$;
