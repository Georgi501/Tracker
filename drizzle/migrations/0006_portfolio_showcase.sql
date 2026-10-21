ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_portfolio boolean NOT NULL DEFAULT false;

-- Returns only symbol/type and share of invested cost (%), never amounts, and only for opted-in public members.
CREATE OR REPLACE FUNCTION public.public_portfolio(_user_id uuid)
RETURNS TABLE(symbol text, name text, type text, weight numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ok AS (SELECT 1 FROM profiles WHERE id = _user_id AND is_public AND share_portfolio AND auth.uid() IS NOT NULL),
  pos AS (
    SELECT a.symbol, a.name, a.type,
      SUM(CASE WHEN t.kind = 'buy' THEN t.quantity * t.price WHEN t.kind = 'sell' THEN -t.quantity * t.price ELSE 0 END) AS cost
    FROM assets a JOIN transactions t ON t.asset_id = a.id
    WHERE a.user_id = _user_id AND EXISTS (SELECT 1 FROM ok)
    GROUP BY a.symbol, a.name, a.type
  )
  SELECT symbol, name, type, ROUND(100 * cost / NULLIF(SUM(cost) OVER (), 0), 1)
  FROM pos WHERE cost > 0 ORDER BY cost DESC
$$;
REVOKE EXECUTE ON FUNCTION public.public_portfolio(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.public_portfolio(uuid) TO authenticated;