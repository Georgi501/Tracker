ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS visitor_id uuid,
  ADD COLUMN IF NOT EXISTS duration_seconds integer
    CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 86400);

CREATE INDEX IF NOT EXISTS analytics_events_visitor_idx
  ON public.analytics_events (visitor_id, created_at);

ALTER TABLE public.analytics_events
  DROP CONSTRAINT analytics_events_event_name_check;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_event_name_check
  CHECK (event_name IN (
    'site_visit', 'visit_end', 'pricing_view', 'signup_completed', 'first_holding_added',
    'manual_entry_started', 'csv_import_started', 'csv_import_completed',
    'checkout_started', 'checkout_completed', 'referral_link_copied'
  ));

DROP FUNCTION IF EXISTS public.record_analytics_event(uuid, text);

CREATE OR REPLACE FUNCTION public.record_analytics_event(
  _session_id uuid,
  _event_name text,
  _visitor_id uuid DEFAULT NULL,
  _duration_seconds integer DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _count integer;
BEGIN
  IF _event_name NOT IN (
    'site_visit', 'visit_end', 'pricing_view', 'signup_completed', 'first_holding_added',
    'manual_entry_started', 'csv_import_started', 'csv_import_completed',
    'checkout_started', 'checkout_completed', 'referral_link_copied'
  ) THEN
    RAISE EXCEPTION 'Unsupported analytics event';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_session_id::text, 0));
  DELETE FROM public.analytics_events WHERE created_at < now() - interval '90 days';
  SELECT count(*) INTO _count
  FROM public.analytics_events
  WHERE created_at > now() - interval '1 minute';
  IF _count >= 1000 THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO _count
  FROM public.analytics_events
  WHERE session_id = _session_id AND created_at > now() - interval '1 minute';
  IF _count >= 30 THEN
    RETURN false;
  END IF;

  INSERT INTO public.analytics_events (session_id, event_name, visitor_id, duration_seconds)
  VALUES (_session_id, _event_name, _visitor_id, _duration_seconds);
  RETURN true;
END $$;

-- Aggregate-only visitor statistics for the admin panel (service role only).
CREATE OR REPLACE FUNCTION public.admin_visitor_stats(_days integer)
RETURNS TABLE (
  unique_visitors bigint,
  sessions bigint,
  returning_visitors bigint,
  avg_session_seconds numeric,
  visitors_pricing bigint,
  visitors_signup bigint
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH ev AS (
    SELECT * FROM public.analytics_events
    WHERE created_at > now() - make_interval(days => _days)
  ),
  sess AS (
    SELECT session_id, sum(duration_seconds) AS secs
    FROM ev WHERE event_name = 'visit_end' GROUP BY session_id
  ),
  per_visitor AS (
    SELECT visitor_id, count(DISTINCT session_id) AS n
    FROM ev WHERE event_name = 'site_visit' AND visitor_id IS NOT NULL GROUP BY visitor_id
  )
  SELECT
    (SELECT count(DISTINCT visitor_id) FROM ev WHERE event_name = 'site_visit' AND visitor_id IS NOT NULL),
    (SELECT count(DISTINCT session_id) FROM ev WHERE event_name = 'site_visit'),
    (SELECT count(*) FROM per_visitor WHERE n > 1),
    (SELECT round(avg(secs)) FROM sess),
    (SELECT count(DISTINCT visitor_id) FROM ev WHERE event_name = 'pricing_view' AND visitor_id IS NOT NULL),
    (SELECT count(DISTINCT visitor_id) FROM ev WHERE event_name = 'signup_completed' AND visitor_id IS NOT NULL)
$$;

REVOKE ALL ON FUNCTION public.admin_visitor_stats(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_visitor_stats(integer) TO service_role;
