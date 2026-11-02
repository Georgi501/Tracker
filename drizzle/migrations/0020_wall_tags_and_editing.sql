-- Wall tags and short-window editing. Edits go through a function so only the body and tags can change.
ALTER TABLE public.wall_posts
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.wall_posts DROP CONSTRAINT IF EXISTS wall_posts_tags_check;
ALTER TABLE public.wall_posts ADD CONSTRAINT wall_posts_tags_check CHECK (cardinality(tags) <= 5);
CREATE INDEX IF NOT EXISTS wall_posts_tags_idx ON public.wall_posts USING gin (tags);

CREATE OR REPLACE FUNCTION public._clean_tags(_tags text[])
RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(array_agg(t ORDER BY first), '{}')
  FROM (
    SELECT t, min(o) AS first
    FROM (
      SELECT lower(btrim(replace(x, '#', ''))) AS t, o
      FROM unnest(COALESCE(_tags, '{}')) WITH ORDINALITY AS u(x, o)
    ) s
    WHERE t ~ '^[[:alnum:]_]{2,24}$'
    GROUP BY t
    ORDER BY min(o)
    LIMIT 5
  ) d
$$;

DROP FUNCTION IF EXISTS public.create_wall_post(text, text, text);
CREATE FUNCTION public.create_wall_post(_body text, _mood text, _level text, _tags text[] DEFAULT '{}')
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
  INSERT INTO wall_posts (user_id, body, mood, share_level, snapshot, tags)
  VALUES (auth.uid(), btrim(_body), _mood, _level, _snap, public._clean_tags(_tags))
  RETURNING id INTO _id;
  RETURN _id;
END
$$;
REVOKE EXECUTE ON FUNCTION public.create_wall_post(text, text, text, text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_wall_post(text, text, text, text[]) TO authenticated;

-- Authors may edit text and tags for 10 minutes; the portfolio snapshot never changes.
CREATE OR REPLACE FUNCTION public.edit_wall_post(_id uuid, _body text, _tags text[] DEFAULT '{}')
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_pro(auth.uid()) THEN
    RAISE EXCEPTION 'Pro membership required';
  END IF;
  IF char_length(btrim(_body)) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Invalid post text';
  END IF;
  UPDATE wall_posts
     SET body = btrim(_body), tags = public._clean_tags(_tags), edited_at = now()
   WHERE id = _id AND user_id = auth.uid() AND created_at > now() - interval '10 minutes';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Editing window has closed';
  END IF;
  RETURN true;
END
$$;
REVOKE EXECUTE ON FUNCTION public.edit_wall_post(uuid, text, text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.edit_wall_post(uuid, text, text[]) TO authenticated;
