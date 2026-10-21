ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text;

UPDATE public.profiles
SET referral_code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
WHERE referral_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET DEFAULT lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key
  ON public.profiles (referral_code);

CREATE OR REPLACE FUNCTION public.prevent_referral_code_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'Referral codes cannot be changed';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER profiles_referral_code_immutable
  BEFORE UPDATE OF referral_code ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_referral_code_change();

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz,
  CHECK (referrer_id <> referred_user_id)
);

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrer views own referrals" ON public.referrals
  FOR SELECT TO authenticated USING (auth.uid() = referrer_id);

CREATE OR REPLACE FUNCTION public.create_referral_for_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _referrer_id uuid;
  _code text;
BEGIN
  _code := NEW.raw_user_meta_data->>'referral_code';
  IF _code IS NULL OR _code !~ '^[a-fA-F0-9]{16}$' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _referrer_id
  FROM public.profiles
  WHERE referral_code = lower(_code);

  IF _referrer_id IS NOT NULL AND _referrer_id <> NEW.id THEN
    INSERT INTO public.referrals (referrer_id, referred_user_id)
    VALUES (_referrer_id, NEW.id)
    ON CONFLICT (referred_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_for_new_user();

CREATE OR REPLACE FUNCTION public.claim_referral_code(_user_id uuid, _code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _referrer_id uuid;
  _created_at timestamptz;
BEGIN
  IF _code !~ '^[a-fA-F0-9]{16}$' THEN
    RETURN false;
  END IF;

  SELECT created_at INTO _created_at FROM auth.users WHERE id = _user_id;
  IF _created_at IS NULL OR _created_at < now() - interval '1 day' THEN
    RETURN false;
  END IF;

  SELECT id INTO _referrer_id
  FROM public.profiles
  WHERE referral_code = lower(_code);
  IF _referrer_id IS NULL OR _referrer_id = _user_id THEN
    RETURN false;
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_user_id)
  VALUES (_referrer_id, _user_id)
  ON CONFLICT (referred_user_id) DO NOTHING;
  RETURN FOUND;
END $$;

REVOKE EXECUTE ON FUNCTION public.claim_referral_code(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral_code(uuid, text) TO service_role;

CREATE TABLE public.pro_entitlement_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referral_id, user_id),
  CHECK (ends_at > starts_at)
);

GRANT ALL ON public.pro_entitlement_grants TO service_role;
ALTER TABLE public.pro_entitlement_grants ENABLE ROW LEVEL SECURITY;
CREATE INDEX pro_entitlement_grants_user_period_idx
  ON public.pro_entitlement_grants (user_id, starts_at, ends_at);

CREATE OR REPLACE FUNCTION public.grant_referral_reward(_referred_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _referral public.referrals%ROWTYPE;
  _beneficiary uuid;
  _starts_at timestamptz;
BEGIN
  SELECT * INTO _referral
  FROM public.referrals
  WHERE referred_user_id = _referred_user_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  FOREACH _beneficiary IN ARRAY ARRAY[_referral.referrer_id, _referral.referred_user_id] LOOP
    SELECT GREATEST(
      now(),
      COALESCE((
        SELECT max(current_period_end)
        FROM public.subscriptions
        WHERE user_id = _beneficiary
          AND environment = 'live'
          AND status IN ('active', 'trialing', 'past_due', 'canceled')
          AND current_period_end > now()
      ), now()),
      COALESCE((
        SELECT max(ends_at)
        FROM public.pro_entitlement_grants
        WHERE user_id = _beneficiary
          AND ends_at > now()
      ), now())
    ) INTO _starts_at;

    INSERT INTO public.pro_entitlement_grants (referral_id, user_id, starts_at, ends_at)
    VALUES (_referral.id, _beneficiary, _starts_at, _starts_at + interval '1 month')
    ON CONFLICT (referral_id, user_id) DO NOTHING;
  END LOOP;

  UPDATE public.referrals
  SET status = 'rewarded', rewarded_at = now()
  WHERE id = _referral.id;
  RETURN true;
END $$;

REVOKE EXECUTE ON FUNCTION public.grant_referral_reward(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_referral_reward(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.is_pro(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id AND (
      (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
      OR (status = 'canceled' AND current_period_end > now())
    )
  ) OR EXISTS (
    SELECT 1 FROM public.pro_entitlement_grants
    WHERE user_id = _user_id AND starts_at <= now() AND ends_at > now()
  )
$$;

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  event_name text NOT NULL CHECK (event_name IN (
    'pricing_view', 'signup_completed', 'first_holding_added',
    'checkout_started', 'checkout_completed', 'referral_link_copied'
  )),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX analytics_events_session_time_idx
  ON public.analytics_events (session_id, created_at);
CREATE INDEX analytics_events_created_at_idx
  ON public.analytics_events (created_at);

CREATE OR REPLACE FUNCTION public.record_analytics_event(_session_id uuid, _event_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _count integer;
BEGIN
  IF _event_name NOT IN (
    'pricing_view', 'signup_completed', 'first_holding_added',
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

REVOKE EXECUTE ON FUNCTION public.record_analytics_event(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_analytics_event(uuid, text) TO service_role;
