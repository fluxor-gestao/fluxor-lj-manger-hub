
CREATE OR REPLACE FUNCTION public.log_change(_type text, _description text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _entry_id uuid;
  _new_version_id uuid;
  _last_version text;
  _maj int := 1; _min int := 0; _patch int := 0;
  _parts text[];
  _new_version text;
  _impls text[] := '{}';
  _fixes text[] := '{}';
  _visuals text[] := '{}';
BEGIN
  IF _type NOT IN ('implementacao','ajuste','melhoria') THEN
    RAISE EXCEPTION 'tipo inválido: %', _type;
  END IF;
  IF _description IS NULL OR length(trim(_description)) = 0 THEN
    RAISE EXCEPTION 'descrição obrigatória';
  END IF;

  -- 1) insere entrada pendente
  INSERT INTO public.changelog_entries(type, description, source_ref)
  VALUES (_type, _description, 'lovable:' || to_char(now(),'YYYYMMDDHH24MISSMS'))
  RETURNING id INTO _entry_id;

  -- 2) calcula próxima versão (bump de patch)
  SELECT version INTO _last_version
  FROM public.system_versions
  ORDER BY string_to_array(regexp_replace(version,'[^0-9.]','','g'),'.')::int[] DESC NULLS LAST,
           created_at DESC
  LIMIT 1;

  IF _last_version IS NOT NULL THEN
    _parts := string_to_array(regexp_replace(_last_version,'[^0-9.]','','g'),'.');
    IF array_length(_parts,1) >= 1 THEN _maj := COALESCE(NULLIF(_parts[1],'')::int, 1); END IF;
    IF array_length(_parts,1) >= 2 THEN _min := COALESCE(NULLIF(_parts[2],'')::int, 0); END IF;
    IF array_length(_parts,1) >= 3 THEN _patch := COALESCE(NULLIF(_parts[3],'')::int, 0); END IF;
  END IF;
  _patch := _patch + 1;
  _new_version := _maj || '.' || _min || '.' || _patch;

  -- 3) monta arrays APENAS com a entrada recém-criada
  IF _type = 'implementacao' THEN _impls := ARRAY[_description];
  ELSIF _type = 'ajuste' THEN _fixes := ARRAY[_description];
  ELSE _visuals := ARRAY[_description]; END IF;

  -- 4) publica a versão
  UPDATE public.system_versions SET is_current=false WHERE is_current=true;
  INSERT INTO public.system_versions(version, release_name, release_date, summary,
    implementations, fixes, visual_improvements, is_current)
  VALUES (_new_version, 'Atualização automática', CURRENT_DATE, _description,
    _impls, _fixes, _visuals, true)
  RETURNING id INTO _new_version_id;

  -- 5) vincula a entrada à versão
  UPDATE public.changelog_entries SET version_id = _new_version_id WHERE id = _entry_id;

  RETURN jsonb_build_object(
    'entry_id', _entry_id,
    'version_id', _new_version_id,
    'new_version', _new_version
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_change(text, text) TO service_role, authenticated;
