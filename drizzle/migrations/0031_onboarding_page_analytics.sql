ALTER TABLE public.analytics_events
  ADD COLUMN page_path text;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_page_path_check
  CHECK (
    page_path IS NULL
    OR (
      event_name IN ('csv_demo_view', 'csv_demo_import_click')
      AND page_path = '/import-demo'
    )
    OR (event_name = 'signup_confirmed' AND page_path = '/auth')
  );

ALTER TABLE public.analytics_events
  DROP CONSTRAINT analytics_events_event_name_check;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_event_name_check
  CHECK (event_name IN (
    'site_visit', 'visit_end', 'pricing_view', 'signup_completed',
    'signup_confirmed', 'first_holding_added', 'csv_demo_view',
    'csv_demo_import_click', 'manual_entry_started', 'csv_import_started',
    'csv_import_completed', 'checkout_started', 'checkout_completed',
    'referral_link_copied'
  ));

DROP FUNCTION public.record_analytics_event(uuid, text, uuid, integer);

CREATE OR REPLACE FUNCTION public.record_analytics_event(
  _session_id uuid,
  _event_name text,
  _visitor_id uuid DEFAULT NULL,
  _duration_seconds integer DEFAULT NULL,
  _page_path text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _count integer;
BEGIN
  IF _event_name NOT IN (
    'site_visit', 'visit_end', 'pricing_view', 'signup_completed',
    'signup_confirmed', 'first_holding_added', 'csv_demo_view',
    'csv_demo_import_click', 'manual_entry_started', 'csv_import_started',
    'csv_import_completed', 'checkout_started', 'checkout_completed',
    'referral_link_copied'
  ) THEN
    RAISE EXCEPTION 'Unsupported analytics event';
  END IF;

  IF (
    _event_name IN ('csv_demo_view', 'csv_demo_import_click')
    AND _page_path IS DISTINCT FROM '/import-demo'
  ) OR (
    _event_name = 'signup_confirmed'
    AND _page_path IS DISTINCT FROM '/auth'
  ) OR (
    _event_name NOT IN ('csv_demo_view', 'csv_demo_import_click', 'signup_confirmed')
    AND _page_path IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Invalid analytics page path';
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

  INSERT INTO public.analytics_events (
    session_id, event_name, visitor_id, duration_seconds, page_path
  ) VALUES (
    _session_id, _event_name, _visitor_id, _duration_seconds, _page_path
  );
  RETURN true;
END $$;

REVOKE EXECUTE ON FUNCTION public.record_analytics_event(uuid, text, uuid, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_analytics_event(uuid, text, uuid, integer, text)
  TO service_role;
