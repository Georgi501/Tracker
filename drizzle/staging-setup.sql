-- Local staging bootstrap for a fresh Supabase project only.
-- Review before use. This does not migrate user data, users, secrets, or payments.
-- Run once in the NEW staging project's Supabase SQL Editor, not in production.
-- Source migrations are applied in numeric order; avatar storage is kept private.
BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Source: 0000_portfolio_schema.sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  lang text NOT NULL DEFAULT 'en',
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Subscriptions: written only by the server (payment webhook)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'pro',
  interval text,
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  provider_subscription_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sub select" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_pro(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _user_id AND status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now()))
$$;

CREATE TABLE public.brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  format text NOT NULL DEFAULT 'generic',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brokers TO authenticated;
GRANT ALL ON public.brokers TO service_role;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brokers" ON public.brokers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_broker_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim int; cnt int;
BEGIN
  lim := CASE WHEN public.is_pro(NEW.user_id) THEN 4 ELSE 1 END;
  SELECT count(*) INTO cnt FROM public.brokers WHERE user_id = NEW.user_id;
  IF cnt >= lim THEN RAISE EXCEPTION 'BROKER_LIMIT:%', lim; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER broker_limit BEFORE INSERT ON public.brokers FOR EACH ROW EXECUTE FUNCTION public.enforce_broker_limit();

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  symbol text NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'stock',
  sector text NOT NULL DEFAULT 'Other',
  region text NOT NULL DEFAULT 'Global',
  manual_price numeric,
  dividend_per_share numeric NOT NULL DEFAULT 0,
  pay_months int[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assets" ON public.assets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  broker_id uuid REFERENCES public.brokers(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('buy','sell','dividend')),
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.transactions(user_id);
CREATE INDEX ON public.assets(user_id);

-- Source: 0001_paddle_subscriptions.sql
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
DO $$ DECLARE c text; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.subscriptions'::regclass AND contype='u' AND conname <> 'subscriptions_paddle_subscription_id_key' LOOP
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT %I', c);
  END LOOP; END $$;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
CREATE OR REPLACE FUNCTION public.is_pro(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _user_id AND (
    (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
    OR (status = 'canceled' AND current_period_end > now())))
$$;

-- Source: 0002_ai_advisor_threads.sql
CREATE TABLE public.ai_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message_id text NOT NULL,
  role text NOT NULL,
  parts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, message_id)
);
CREATE INDEX ai_threads_user_idx ON public.ai_threads(user_id, updated_at DESC);
CREATE INDEX ai_messages_thread_idx ON public.ai_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_threads TO service_role;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads" ON public.ai_threads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own messages" ON public.ai_messages FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.ai_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));

-- Source: 0003_create_goals.sql
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  target numeric NOT NULL CHECK (target > 0),
  target_date date NOT NULL,
  monthly numeric NOT NULL DEFAULT 0 CHECK (monthly >= 0),
  annual_return numeric NOT NULL DEFAULT 6 CHECK (annual_return BETWEEN -50 AND 50),
  currency text NOT NULL CHECK (currency IN ('EUR','USD')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own goals select" ON public.goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own goals insert" ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own goals update" ON public.goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own goals delete" ON public.goals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX goals_user_idx ON public.goals(user_id);

-- Source: 0004_create_feedback.sql
CREATE TABLE public.feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 category text NOT NULL CHECK (category IN ('idea', 'bug', 'other')),
 message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 10 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users submit own feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users read own feedback" ON public.feedback FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE INDEX feedback_user_created_idx ON public.feedback (user_id, created_at DESC);

-- Source: 0005_community_profiles_chat.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS investing_style text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE POLICY "public profiles visible to members" ON public.profiles FOR SELECT TO authenticated USING (is_public = true);

CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid(),
  recipient_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX direct_messages_pair_idx ON public.direct_messages (sender_id, recipient_id, created_at);
CREATE INDEX direct_messages_recipient_idx ON public.direct_messages (recipient_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own conversations" ON public.direct_messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "send to public members" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND sender_id <> recipient_id
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = recipient_id AND p.is_public)
);
CREATE POLICY "recipient marks read" ON public.direct_messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

CREATE POLICY "members view avatars" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "own avatar upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own avatar update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own avatar delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Source: 0006_portfolio_showcase.sql
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

-- Source: 0007_community_pro_only.sql
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

-- Source: 0008_investing_journal.sql
CREATE TABLE public.journal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  symbol text NOT NULL,
  thesis text NOT NULL DEFAULT '',
  horizon text NOT NULL DEFAULT '',
  review_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_notes TO authenticated;
GRANT ALL ON public.journal_notes TO service_role;
ALTER TABLE public.journal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal" ON public.journal_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Source: 0009_referrals_and_analytics.sql
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

-- Source: 0010_account_management.sql
DO $$
DECLARE
  _table text;
  _column text;
  _constraint text;
BEGIN
  FOR _table, _column IN
    SELECT * FROM (VALUES
      ('subscriptions', 'user_id'),
      ('brokers', 'user_id'),
      ('assets', 'user_id'),
      ('transactions', 'user_id'),
      ('goals', 'user_id'),
      ('ai_threads', 'user_id'),
      ('ai_messages', 'user_id'),
      ('feedback', 'user_id'),
      ('journal_notes', 'user_id'),
      ('direct_messages', 'sender_id'),
      ('direct_messages', 'recipient_id')
    ) AS targets(table_name, column_name)
  LOOP
    _constraint := format('%s_%s_account_delete_fkey', _table, _column);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', _table)::regclass
        AND conname = _constraint
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
        _table, _constraint, _column
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.pro_entitlement_grants
  ALTER COLUMN referral_id DROP NOT NULL;
ALTER TABLE public.pro_entitlement_grants
  DROP CONSTRAINT IF EXISTS pro_entitlement_grants_referral_id_fkey;
ALTER TABLE public.pro_entitlement_grants
  ADD CONSTRAINT pro_entitlement_grants_referral_id_fkey
  FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE SET NULL;

-- Source: 0011_pro_broker_limit_5.sql
CREATE OR REPLACE FUNCTION public.enforce_broker_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim int; cnt int;
BEGIN
  lim := CASE WHEN public.is_pro(NEW.user_id) THEN 5 ELSE 1 END;
  SELECT count(*) INTO cnt FROM public.brokers WHERE user_id = NEW.user_id;
  IF cnt >= lim THEN RAISE EXCEPTION 'BROKER_LIMIT:%', lim; END IF;
  RETURN NEW;
END $$;

-- Replace the broad authenticated-member avatar read policy from migration 0005.
DROP POLICY IF EXISTS "members view avatars" ON storage.objects;
DROP POLICY IF EXISTS "authorized members view public avatars" ON storage.objects;
CREATE POLICY "authorized members view public avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.is_public = true
          AND public.is_pro(auth.uid())
      )
    )
  );

COMMIT;
