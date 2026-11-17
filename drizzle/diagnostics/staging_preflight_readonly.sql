-- Read-only Staging Preflight Diagnostics (safe to run in Supabase SQL Editor for project `ijaogqbfidyidxclfcij`).
-- Performs ONLY metadata SELECT queries; exposes zero user data, passwords, or API keys.

-- 1. Required tables & columns for Stage A (0034_security_hardening.sql)
SELECT
  expected.table_name,
  expected.column_name,
  (c.column_name IS NOT NULL) AS exists_in_staging
FROM (
  VALUES
    ('profiles', 'id'),
    ('profiles', 'display_name'),
    ('profiles', 'bio'),
    ('profiles', 'investing_style'),
    ('profiles', 'avatar_path'),
    ('profiles', 'is_public'),
    ('profiles', 'share_portfolio'),
    ('profiles', 'share_level'),
    ('subscriptions', 'user_id'),
    ('subscriptions', 'status'),
    ('subscriptions', 'current_period_end'),
    ('subscriptions', 'updated_at'),
    ('pro_entitlement_grants', 'user_id'),
    ('pro_entitlement_grants', 'starts_at'),
    ('pro_entitlement_grants', 'ends_at'),
    ('pro_access_grants', 'user_id'),
    ('pro_access_grants', 'revoked_at'),
    ('direct_messages', 'sender_id'),
    ('direct_messages', 'recipient_id')
) AS expected(table_name, column_name)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = expected.table_name
 AND c.column_name = expected.column_name
ORDER BY expected.table_name, expected.column_name;

-- 2. Required & target functions + signatures + owner + security_definer + search_path
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS is_security_definer,
  p.proconfig AS config_settings,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_pro',
    'is_pro_internal',
    'wall_blocked',
    'admin_dashboard_stats',
    'admin_user_summary'
  )
ORDER BY p.proname;

-- 3. Existing public_profiles view (if any)
SELECT
  table_schema,
  table_name,
  view_definition IS NOT NULL AS exists_in_staging
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'public_profiles';

-- 4. Current RLS policies on profiles, direct_messages, and storage.objects (avatars)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('profiles', 'direct_messages'))
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, policyname;

-- 5. Avatars storage bucket status (must exist and have public = false)
SELECT
  id,
  name,
  public,
  (public = false) AS is_private
FROM storage.buckets
WHERE id = 'avatars';

-- 6. Migration tracking tables present (if any)
SELECT
  table_schema,
  table_name
FROM information_schema.tables
WHERE (table_schema = 'supabase_migrations' AND table_name = 'schema_migrations')
   OR (table_schema = 'drizzle' AND table_name = '__drizzle_migrations');
