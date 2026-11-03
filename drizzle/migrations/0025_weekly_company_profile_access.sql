CREATE TABLE public.company_profile_weekly_views (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  symbol text NOT NULL CHECK (symbol ~ '^[A-Z0-9.^:=_-]{1,20}$'),
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start, symbol)
);

ALTER TABLE public.company_profile_weekly_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.company_profile_weekly_views FROM anon, authenticated;
GRANT ALL ON TABLE public.company_profile_weekly_views TO service_role;

CREATE OR REPLACE FUNCTION public.claim_company_profile_view(_symbol text)
RETURNS TABLE (allowed boolean, used integer, resets_on date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_week_start date := date_trunc('week', now() AT TIME ZONE 'UTC')::date;
  v_symbol text := upper(trim(_symbol));
  v_used integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_symbol !~ '^[A-Z0-9.^:=_-]{1,20}$' THEN
    RAISE EXCEPTION 'Invalid company symbol';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  DELETE FROM public.company_profile_weekly_views
    WHERE user_id = v_user_id AND week_start < v_week_start - 56;

  IF public.is_pro(v_user_id) THEN
    RETURN QUERY SELECT true, 0, v_week_start + 7;
    RETURN;
  END IF;

  SELECT count(*)::integer
    INTO v_used
    FROM public.company_profile_weekly_views
    WHERE user_id = v_user_id AND week_start = v_week_start;

  IF EXISTS (
    SELECT 1
      FROM public.company_profile_weekly_views
      WHERE user_id = v_user_id
        AND week_start = v_week_start
        AND symbol = v_symbol
  ) THEN
    RETURN QUERY SELECT true, v_used, v_week_start + 7;
    RETURN;
  END IF;

  IF v_used >= 2 THEN
    RETURN QUERY SELECT false, v_used, v_week_start + 7;
    RETURN;
  END IF;

  INSERT INTO public.company_profile_weekly_views (user_id, week_start, symbol)
    VALUES (v_user_id, v_week_start, v_symbol);

  RETURN QUERY SELECT true, v_used + 1, v_week_start + 7;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_company_profile_view(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_company_profile_view(text) TO authenticated;
