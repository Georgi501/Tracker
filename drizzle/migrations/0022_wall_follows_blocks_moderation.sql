-- Follows, blocks and moderation for the community wall.
ALTER TABLE public.wall_posts ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

CREATE TABLE IF NOT EXISTS public.wall_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE TABLE IF NOT EXISTS public.wall_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.wall_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own follows" ON public.wall_follows FOR SELECT TO authenticated USING (follower_id = auth.uid());
CREATE POLICY "pro members follow" ON public.wall_follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid() AND public.is_pro(auth.uid()));
CREATE POLICY "remove own follows" ON public.wall_follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

CREATE POLICY "read own blocks" ON public.wall_blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "pro members block" ON public.wall_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid() AND public.is_pro(auth.uid()));
CREATE POLICY "remove own blocks" ON public.wall_blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- True when either member has blocked the other. SECURITY DEFINER so a policy can see the other side's rows
-- without revealing who blocked whom.
CREATE OR REPLACE FUNCTION public.wall_blocked(_other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM wall_blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = _other)
       OR (blocker_id = _other AND blocked_id = auth.uid())
  )
$$;
REVOKE EXECUTE ON FUNCTION public.wall_blocked(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wall_blocked(uuid) TO authenticated;

-- Hidden (moderated) posts stay visible to their author only; blocked members never see each other's content.
DROP POLICY IF EXISTS "pro members read wall posts" ON public.wall_posts;
CREATE POLICY "pro members read wall posts" ON public.wall_posts FOR SELECT TO authenticated
  USING (
    public.is_pro(auth.uid())
    AND (hidden_at IS NULL OR user_id = auth.uid())
    AND NOT public.wall_blocked(user_id)
  );

DROP POLICY IF EXISTS "pro members read comments" ON public.wall_comments;
CREATE POLICY "pro members read comments" ON public.wall_comments FOR SELECT TO authenticated
  USING (public.is_pro(auth.uid()) AND NOT public.wall_blocked(user_id));

DROP POLICY IF EXISTS "public pro members comment" ON public.wall_comments;
CREATE POLICY "public pro members comment" ON public.wall_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND public.is_pro(auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_public)
    AND EXISTS (
      SELECT 1 FROM public.wall_posts w
      WHERE w.id = post_id AND w.hidden_at IS NULL AND NOT public.wall_blocked(w.user_id)
    )
  );

DROP POLICY IF EXISTS "pro members send to public members" ON public.direct_messages;
CREATE POLICY "pro members send to public members" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND sender_id <> recipient_id AND public.is_pro(auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = recipient_id AND p.is_public)
  AND NOT public.wall_blocked(recipient_id)
);
