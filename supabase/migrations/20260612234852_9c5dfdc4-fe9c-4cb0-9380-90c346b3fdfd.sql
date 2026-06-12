
ALTER TABLE public.changelog_entries ADD COLUMN source_ref TEXT;
CREATE UNIQUE INDEX idx_changelog_entries_source_ref_unique
  ON public.changelog_entries(source_ref) WHERE source_ref IS NOT NULL;
