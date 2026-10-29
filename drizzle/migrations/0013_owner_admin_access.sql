CREATE TABLE public.site_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pro_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);

CREATE UNIQUE INDEX pro_access_grants_one_active_per_user
  ON public.pro_access_grants (user_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.site_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_access_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_admins, public.pro_access_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.site_admins, public.pro_access_grants TO service_role;

CREATE OR REPLACE FUNCTION public.is_site_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.site_admins WHERE user_id = auth.uid()
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_site_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_site_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_pro(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id AND (
      (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
      OR (status = 'canceled' AND current_period_end > now())
    )
  ) OR EXISTS (
    SELECT 1 FROM public.pro_entitlement_grants
    WHERE user_id = _user_id AND starts_at <= now() AND ends_at > now()
  ) OR EXISTS (
    SELECT 1 FROM public.pro_access_grants
    WHERE user_id = _user_id AND revoked_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS TABLE(total_users bigint, active_subscriptions bigint, pro_accounts bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT
    (SELECT count(*) FROM auth.users),
    (SELECT count(*) FROM public.subscriptions
      WHERE status IN ('active', 'trialing')
        AND (current_period_end IS NULL OR current_period_end > now())),
    (SELECT count(*) FROM auth.users AS u WHERE public.is_pro(u.id))
$$;

CREATE OR REPLACE FUNCTION public.admin_user_summary(_email text)
RETURNS TABLE(
  user_id uuid,
  email text,
  created_at timestamptz,
  pro boolean,
  subscription_status text,
  current_period_end timestamptz,
  has_admin_grant boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT
    u.id,
    u.email,
    u.created_at,
    public.is_pro(u.id),
    subscription.status,
    subscription.current_period_end,
    EXISTS (
      SELECT 1 FROM public.pro_access_grants AS grant_row
      WHERE grant_row.user_id = u.id AND grant_row.revoked_at IS NULL
    )
  FROM auth.users AS u
  LEFT JOIN LATERAL (
    SELECT s.status, s.current_period_end
    FROM public.subscriptions AS s
    WHERE s.user_id = u.id
    ORDER BY s.updated_at DESC
    LIMIT 1
  ) AS subscription ON true
  WHERE lower(u.email) = lower(trim(_email))
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.admin_set_pro_access(
  _user_id uuid,
  _actor_id uuid,
  _enabled boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.site_admins WHERE user_id = _actor_id) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RAISE EXCEPTION 'Account not found';
  END IF;
  IF NOT _enabled AND EXISTS (
    SELECT 1 FROM public.site_admins WHERE user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'Owner Pro access cannot be revoked';
  END IF;

  IF _enabled THEN
    INSERT INTO public.pro_access_grants (user_id, granted_by)
    VALUES (_user_id, _actor_id)
    ON CONFLICT (user_id) WHERE revoked_at IS NULL DO NOTHING;
  ELSE
    UPDATE public.pro_access_grants
    SET revoked_at = now(), revoked_by = _actor_id
    WHERE user_id = _user_id AND revoked_at IS NULL;
  END IF;
  RETURN _enabled;
END
$$;

REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_user_summary(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_pro_access(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_user_summary(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_pro_access(uuid, uuid, boolean) TO service_role;
