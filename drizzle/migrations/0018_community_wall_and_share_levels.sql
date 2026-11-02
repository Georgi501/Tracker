-- Share level for the profile showcase and a Pro-only community wall.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_level text NOT NULL DEFAULT 'weights'
  CHECK (share_level IN ('assets', 'weights', 'shares', 'amounts'));

-- Internal helper: rows are limited by the requested level. Never callable by clients.
CREATE OR REPLACE FUNCTION public._portfolio_rows(_user_id uuid, _level text)
RETURNS TABLE(symbol text, name text, type text, weight numeric, quantity numeric, cost_usd numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH pos AS (
    SELECT a.symbol, a.name, a.type,
      SUM(CASE WHEN t.kind = 'buy' THEN t.quantity * t.price WHEN t.kind = 'sell' THEN -t.quantity * t.price ELSE 0 END) AS cost,
      SUM(CASE WHEN t.kind = 'buy' THEN t.quantity WHEN t.kind = 'sell' THEN -t.quantity ELSE 0 END) AS qty
    FROM assets a JOIN transactions t ON t.asset_id = a.id
    WHERE a.user_id = _user_id
    GROUP BY a.symbol, a.name, a.type
  )
  SELECT pos.symbol, pos.name, pos.type,
    CASE WHEN _level IN ('weights', 'shares', 'amounts') THEN ROUND(100 * pos.cost / NULLIF(SUM(pos.cost) OVER (), 0), 1) END,
    CASE WHEN _level IN ('shares', 'amounts') THEN pos.qty END,
    CASE WHEN _level = 'amounts' THEN ROUND(pos.cost, 2) END
  FROM pos WHERE pos.cost > 0
  -- Asset-only lists are alphabetical so the order cannot reveal position sizes.
  ORDER BY CASE WHEN _level = 'assets' THEN 0 ELSE pos.cost END DESC, pos.symbol
$$;
REVOKE EXECUTE ON FUNCTION public._portfolio_rows(uuid, text) FROM public, anon, authenticated;

DROP FUNCTION IF EXISTS public.public_portfolio(uuid);
CREATE FUNCTION public.public_portfolio(_user_id uuid)
RETURNS TABLE(symbol text, name text, type text, weight numeric, quantity numeric, cost_usd numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.* FROM profiles p, LATERAL public._portfolio_rows(p.id, p.share_level) r
  WHERE p.id = _user_id AND p.is_public AND p.share_portfolio
    AND auth.uid() IS NOT NULL AND public.is_pro(auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.public_portfolio(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.public_portfolio(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.wall_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  mood text NOT NULL DEFAULT 'chat' CHECK (mood IN ('brag', 'vent', 'question', 'chat')),
  share_level text CHECK (share_level IN ('assets', 'weights', 'shares', 'amounts')),
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wall_posts_created_idx ON public.wall_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS wall_posts_user_idx ON public.wall_posts (user_id);

CREATE TABLE IF NOT EXISTS public.wall_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wall_comments_post_idx ON public.wall_comments (post_id, created_at);

CREATE TABLE IF NOT EXISTS public.wall_reactions (
  post_id uuid NOT NULL REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('🚀', '👏', '🔥', '💪', '🤝', '😢')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.wall_reports (
  post_id uuid NOT NULL REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, reporter_id)
);

ALTER TABLE public.wall_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_reports ENABLE ROW LEVEL SECURITY;

-- Posts are created only through create_wall_post so a snapshot cannot be forged.
CREATE POLICY "pro members read wall posts" ON public.wall_posts FOR SELECT TO authenticated
  USING (public.is_pro(auth.uid()));
CREATE POLICY "authors delete own wall posts" ON public.wall_posts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "pro members read comments" ON public.wall_comments FOR SELECT TO authenticated
  USING (public.is_pro(auth.uid()));
CREATE POLICY "public pro members comment" ON public.wall_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND public.is_pro(auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_public)
  );
CREATE POLICY "authors or post owners delete comments" ON public.wall_comments FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.wall_posts w WHERE w.id = post_id AND w.user_id = auth.uid())
  );

CREATE POLICY "pro members read reactions" ON public.wall_reactions FOR SELECT TO authenticated
  USING (public.is_pro(auth.uid()));
CREATE POLICY "pro members react" ON public.wall_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_pro(auth.uid()));
CREATE POLICY "members remove own reactions" ON public.wall_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "pro members report" ON public.wall_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND public.is_pro(auth.uid()));

CREATE OR REPLACE FUNCTION public.create_wall_post(_body text, _mood text, _level text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid;
  _snap jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_pro(auth.uid()) THEN
    RAISE EXCEPTION 'Pro membership required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_public) THEN
    RAISE EXCEPTION 'Make your profile public to post';
  END IF;
  IF (SELECT count(*) FROM wall_posts WHERE user_id = auth.uid() AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Too many posts, try again later';
  END IF;
  IF _level IS NOT NULL THEN
    IF _level NOT IN ('assets', 'weights', 'shares', 'amounts') THEN
      RAISE EXCEPTION 'Invalid share level';
    END IF;
    SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO _snap
    FROM public._portfolio_rows(auth.uid(), _level) r;
  END IF;
  INSERT INTO wall_posts (user_id, body, mood, share_level, snapshot)
  VALUES (auth.uid(), btrim(_body), _mood, _level, _snap)
  RETURNING id INTO _id;
  RETURN _id;
END
$$;
REVOKE EXECUTE ON FUNCTION public.create_wall_post(text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_wall_post(text, text, text) TO authenticated;
