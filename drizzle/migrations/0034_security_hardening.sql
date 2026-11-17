-- Phase 2 Security Hardening — Stage A (Expand, zero-downtime safe before frontend deploy):
-- 1. Prevent Pro-status enumeration via public.is_pro(uuid) with restricted search_path and explicit role check
-- 2. Expose only safe public profile columns via public.public_profiles
-- 3. Update direct_messages & avatars policies to reference public.public_profiles so Stage C
--    (dropping legacy public.profiles SELECT policy after Worker deploy) does not break DMs or avatar signed URLs.

CREATE OR REPLACE FUNCTION public.is_pro(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    _user_id = auth.uid()
    OR current_user IN ('service_role', 'postgres', 'supabase_admin')
  ) AND (
    EXISTS (
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
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_pro(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pro(uuid) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  bio,
  investing_style,
  avatar_path,
  is_public,
  share_portfolio,
  share_level
FROM public.profiles
WHERE id = auth.uid()
   OR (is_public = true AND public.is_pro(auth.uid()));

REVOKE ALL ON public.public_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.public_profiles TO authenticated, service_role;

DROP POLICY IF EXISTS "pro members send to public members" ON public.direct_messages;
CREATE POLICY "pro members send to public members" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id <> recipient_id
    AND public.is_pro(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.public_profiles p
      WHERE p.id = recipient_id
        AND p.is_public = true
    )
    AND NOT public.wall_blocked(recipient_id)
  );

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
        FROM public.public_profiles p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.is_public = true
      )
    )
  );
