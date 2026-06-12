CREATE OR REPLACE FUNCTION public.check_service_duplicates()
RETURNS TABLE (devis_id UUID, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.devis_id, count(*) as count
    FROM public.services s
    WHERE s.devis_id IS NOT NULL
    GROUP BY s.devis_id
    HAVING count(*) > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_service_duplicates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_service_duplicates() TO service_role;