-- Stage: Admin Panel Pro Grant Expiration & Atomic Audit Trail (FOR REVIEW ONLY - DO NOT APPLY WITHOUT APPROVAL)
-- 1. Add optional expires_at to public.pro_access_grants for temporary manual Pro grants.
-- 2. Update public.is_pro_internal(uuid) to respect expires_at on manual grants.
-- 3. Add public.admin_audit_logs for minimal administrative grant/revoke audit trail.
-- 4. Add atomic public.admin_set_pro_access_with_audit(...) so entitlement mutation + audit insert
--    execute in a single PostgreSQL transaction (both succeed or both roll back).

ALTER TABLE public.pro_access_grants
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pro_access_grants_expires_after_created'
      AND conrelid = 'public.pro_access_grants'::regclass
  ) THEN
    ALTER TABLE public.pro_access_grants
      ADD CONSTRAINT pro_access_grants_expires_after_created
      CHECK (expires_at IS NULL OR expires_at > created_at);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_pro_internal(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
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
    WHERE user_id = _user_id
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

REVOKE ALL ON FUNCTION public.is_pro_internal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_pro_internal(uuid) TO service_role;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('grant', 'revoke')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx
  ON public.admin_audit_logs (created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

CREATE OR REPLACE FUNCTION public.admin_set_pro_access_with_audit(
  _user_id uuid,
  _actor_id uuid,
  _enabled boolean,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    IF _expires_at IS NOT NULL AND _expires_at <= now() THEN
      RAISE EXCEPTION 'Expiration date must be in the future';
    END IF;
    INSERT INTO public.pro_access_grants (user_id, granted_by, expires_at)
    VALUES (_user_id, _actor_id, _expires_at)
    ON CONFLICT (user_id) WHERE revoked_at IS NULL
    DO UPDATE SET
      expires_at = EXCLUDED.expires_at,
      granted_by = EXCLUDED.granted_by;
  ELSE
    UPDATE public.pro_access_grants
    SET revoked_at = now(), revoked_by = _actor_id
    WHERE user_id = _user_id AND revoked_at IS NULL;
  END IF;

  INSERT INTO public.admin_audit_logs (actor_id, target_user_id, action, expires_at)
  VALUES (
    _actor_id,
    _user_id,
    CASE WHEN _enabled THEN 'grant' ELSE 'revoke' END,
    CASE WHEN _enabled THEN _expires_at ELSE NULL END
  );

  RETURN _enabled;
END
$$;

REVOKE ALL ON FUNCTION public.admin_set_pro_access_with_audit(uuid, uuid, boolean, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_pro_access_with_audit(uuid, uuid, boolean, timestamptz) TO service_role;
