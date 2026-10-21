DROP POLICY IF EXISTS "public profiles visible to members" ON public.profiles;
CREATE POLICY "public profiles visible to pro members" ON public.profiles FOR SELECT TO authenticated USING (is_public = true AND public.is_pro(auth.uid()));

DROP POLICY IF EXISTS "send to public members" ON public.direct_messages;
CREATE POLICY "pro members send to public members" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND sender_id <> recipient_id AND public.is_pro(auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = recipient_id AND p.is_public)
);

CREATE OR REPLACE FUNCTION public.public_portfolio(_user_id uuid)
RETURNS TABLE(symbol text, name text, type text, weight numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ok AS (SELECT 1 FROM profiles WHERE id = _user_id AND is_public AND share_portfolio AND auth.uid() IS NOT NULL AND public.is_pro(auth.uid())),
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