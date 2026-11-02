-- Aggregate counts only, so signed-in free members can see the wall is active without reading any content.
CREATE OR REPLACE FUNCTION public.wall_stats()
RETURNS TABLE(posts bigint, members bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM wall_posts WHERE created_at > now() - interval '30 days'),
    (SELECT count(*) FROM profiles WHERE is_public)
  WHERE auth.uid() IS NOT NULL
$$;
REVOKE EXECUTE ON FUNCTION public.wall_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wall_stats() TO authenticated;
