
GRANT SELECT ON public.system_versions TO anon;

CREATE POLICY "Anyone can view current system version"
ON public.system_versions
FOR SELECT
TO anon
USING (is_current = true);
