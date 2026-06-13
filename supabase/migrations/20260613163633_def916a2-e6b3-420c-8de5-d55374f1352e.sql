
CREATE OR REPLACE FUNCTION public.auto_release_changelog(_summary text DEFAULT NULL, _release_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _pending_count int;
  _impls text[];
  _fixes text[];
  _visuals text[];
  _last_version text;
  _maj int := 1; _min int := 0; _patch int := 0;
  _parts text[];
  _new_version text;
  _new_id uuid;
  _name text;
  _summ text;
BEGIN
  SELECT COUNT(*) INTO _pending_count FROM public.changelog_entries WHERE version_id IS NULL;
  IF _pending_count = 0 THEN RETURN NULL; END IF;

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

  SELECT COALESCE(array_agg(description ORDER BY created_at),'{}'::text[]) INTO _impls
    FROM public.changelog_entries WHERE version_id IS NULL AND type='implementacao';
  SELECT COALESCE(array_agg(description ORDER BY created_at),'{}'::text[]) INTO _fixes
    FROM public.changelog_entries WHERE version_id IS NULL AND type='ajuste';
  SELECT COALESCE(array_agg(description ORDER BY created_at),'{}'::text[]) INTO _visuals
    FROM public.changelog_entries WHERE version_id IS NULL AND type='melhoria';

  _name := COALESCE(_release_name, 'Atualização automática');
  _summ := COALESCE(_summary,
    'Release automático com ' || _pending_count || ' alteração(ões): '
    || array_length(_impls,1) || ' implementação(ões), '
    || array_length(_fixes,1) || ' ajuste(s), '
    || array_length(_visuals,1) || ' melhoria(s).');

  UPDATE public.system_versions SET is_current=false WHERE is_current=true;

  INSERT INTO public.system_versions(version, release_name, release_date, summary,
    implementations, fixes, visual_improvements, is_current)
  VALUES (_new_version, _name, CURRENT_DATE, _summ, _impls, _fixes, _visuals, true)
  RETURNING id INTO _new_id;

  UPDATE public.changelog_entries SET version_id = _new_id WHERE version_id IS NULL;
  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_release_changelog(text, text) TO service_role, authenticated;
