ALTER TABLE public.analytics_events
  DROP CONSTRAINT analytics_events_event_name_check;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_event_name_check
  CHECK (event_name IN (
    'pricing_view', 'signup_completed', 'first_holding_added',
    'manual_entry_started', 'csv_import_started', 'csv_import_completed',
    'checkout_started', 'checkout_completed', 'referral_link_copied'
  ));

CREATE OR REPLACE FUNCTION public.record_analytics_event(_session_id uuid, _event_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _count integer;
BEGIN
  IF _event_name NOT IN (
    'pricing_view', 'signup_completed', 'first_holding_added',
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

  INSERT INTO public.analytics_events (session_id, event_name) VALUES (_session_id, _event_name);
  RETURN true;
END $$;
