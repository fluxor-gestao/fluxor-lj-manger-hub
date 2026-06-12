
CREATE TYPE public.changelog_entry_type AS ENUM ('ajuste', 'melhoria', 'implementacao');

CREATE TABLE public.changelog_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.changelog_entry_type NOT NULL,
  description TEXT NOT NULL,
  version_id UUID REFERENCES public.system_versions(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_changelog_entries_version ON public.changelog_entries(version_id);
CREATE INDEX idx_changelog_entries_pending ON public.changelog_entries(created_at) WHERE version_id IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.changelog_entries TO authenticated;
GRANT ALL ON public.changelog_entries TO service_role;

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view changelog"
  ON public.changelog_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert changelog"
  ON public.changelog_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update changelog"
  ON public.changelog_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete changelog"
  ON public.changelog_entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_changelog_entries_updated_at
  BEFORE UPDATE ON public.changelog_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.release_system_version(
  _version TEXT,
  _release_name TEXT,
  _summary TEXT,
  _release_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id UUID;
  _impls TEXT[];
  _fixes TEXT[];
  _visuals TEXT[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem lançar versões';
  END IF;

  SELECT COALESCE(array_agg(description ORDER BY created_at), ARRAY[]::TEXT[])
    INTO _impls FROM public.changelog_entries
    WHERE version_id IS NULL AND type = 'implementacao';

  SELECT COALESCE(array_agg(description ORDER BY created_at), ARRAY[]::TEXT[])
    INTO _fixes FROM public.changelog_entries
    WHERE version_id IS NULL AND type = 'ajuste';

  SELECT COALESCE(array_agg(description ORDER BY created_at), ARRAY[]::TEXT[])
    INTO _visuals FROM public.changelog_entries
    WHERE version_id IS NULL AND type = 'melhoria';

  UPDATE public.system_versions SET is_current = false WHERE is_current = true;

  INSERT INTO public.system_versions (
    version, release_name, release_date, summary,
    implementations, fixes, visual_improvements, is_current
  ) VALUES (
    _version, _release_name, _release_date, _summary,
    _impls, _fixes, _visuals, true
  ) RETURNING id INTO _new_id;

  UPDATE public.changelog_entries
    SET version_id = _new_id
    WHERE version_id IS NULL;

  RETURN _new_id;
END;
$$;
