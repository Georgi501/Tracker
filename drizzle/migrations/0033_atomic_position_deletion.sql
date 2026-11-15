-- Atomic owner-only position deletion and Undo. Run only after migration 0032.
-- Snapshots are recoverable for exactly 24 hours; cleanup clears expired payloads server-side.
BEGIN;
CREATE TABLE public.position_deletions (
  operation_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz,
  purged_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  symbol text NOT NULL,
  CHECK ((restored_at IS NULL AND purged_at IS NULL) = (snapshot IS NOT NULL))
);
ALTER TABLE public.position_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.position_deletions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.position_deletions TO service_role;
CREATE INDEX position_deletions_owner_idx ON public.position_deletions(user_id);

CREATE INDEX position_deletions_expiry_idx ON public.position_deletions(expires_at) WHERE snapshot IS NOT NULL;

-- Internal receipt formatter: no payload is returned to the browser.
CREATE FUNCTION public.position_deletion_receipt(p_row public.position_deletions)
RETURNS jsonb LANGUAGE sql VOLATILE SET search_path = '' AS $$
  SELECT pg_catalog.jsonb_build_object('operationId', p_row.operation_id, 'assetId', p_row.asset_id,
    'symbol', p_row.symbol, 'expiresAt', p_row.expires_at, 'serverNow', pg_catalog.clock_timestamp(),
    'state', CASE WHEN p_row.restored_at IS NOT NULL THEN 'restored'
      WHEN p_row.purged_at IS NOT NULL OR p_row.expires_at <= pg_catalog.clock_timestamp() THEN 'expired'
      ELSE 'deleted' END)
$$;
REVOKE ALL ON FUNCTION public.position_deletion_receipt(public.position_deletions) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.delete_position(p_asset_id uuid, p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_asset public.assets%ROWTYPE;
  v_receipt public.position_deletions%ROWTYPE;
  v_snapshot jsonb;
  v_created timestamptz;
BEGIN
  IF v_user IS NULL OR p_asset_id IS NULL OR p_operation_id IS NULL THEN
    RAISE EXCEPTION 'POSITION_AUTH_OR_INPUT_INVALID';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text, 0));
  SELECT * INTO v_receipt FROM public.position_deletions WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF v_receipt.user_id <> v_user OR v_receipt.asset_id <> p_asset_id THEN
      RAISE EXCEPTION 'POSITION_OPERATION_UNAVAILABLE';
    END IF;
    RETURN public.position_deletion_receipt(v_receipt);
  END IF;
  -- The parent lock blocks new FK references until this transaction finishes.
  SELECT * INTO v_asset FROM public.assets WHERE id = p_asset_id AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'POSITION_NOT_FOUND'; END IF;
  -- Keep the existing transfer restriction, enforced even when the UI is stale.
  IF EXISTS (SELECT 1 FROM public.broker_transfers WHERE asset_id = p_asset_id) THEN
    RAISE EXCEPTION 'POSITION_HAS_TRANSFERS';
  END IF;
  -- Lock existing children before taking the authoritative database snapshot.
  PERFORM 1 FROM public.transactions WHERE asset_id = p_asset_id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.corporate_actions WHERE asset_id = p_asset_id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.asset_valuations WHERE asset_id = p_asset_id ORDER BY id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.transactions WHERE asset_id = p_asset_id AND user_id <> v_user)
    OR EXISTS (SELECT 1 FROM public.corporate_actions WHERE asset_id = p_asset_id AND user_id <> v_user)
    OR EXISTS (SELECT 1 FROM public.asset_valuations WHERE asset_id = p_asset_id AND user_id <> v_user) THEN
    RAISE EXCEPTION 'POSITION_INVALID_RELATED_OWNER';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.transactions t WHERE t.asset_id = p_asset_id AND t.broker_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.brokers b WHERE b.id = t.broker_id AND b.user_id = v_user)
  ) THEN RAISE EXCEPTION 'POSITION_BROKER_UNAVAILABLE'; END IF;
  SELECT pg_catalog.jsonb_build_object(
    'asset', pg_catalog.to_jsonb(v_asset),
    'transactions', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t) ORDER BY t.id) FROM public.transactions t WHERE t.asset_id = p_asset_id), '[]'::jsonb),
    'corporate_actions', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.id) FROM public.corporate_actions a WHERE a.asset_id = p_asset_id), '[]'::jsonb),
    'asset_valuations', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(v) ORDER BY v.id) FROM public.asset_valuations v WHERE v.asset_id = p_asset_id), '[]'::jsonb)
  ) INTO v_snapshot;
  v_created := pg_catalog.clock_timestamp();
  INSERT INTO public.position_deletions(operation_id, user_id, asset_id, snapshot, symbol, created_at, expires_at)
    VALUES (p_operation_id, v_user, p_asset_id, v_snapshot, v_asset.symbol, v_created, v_created + interval '24 hours') RETURNING * INTO v_receipt;
  -- A failure here rolls back the receipt and every cascaded child deletion.
  DELETE FROM public.assets WHERE id = p_asset_id AND user_id = v_user;
  RETURN public.position_deletion_receipt(v_receipt);
END;
$$;

CREATE FUNCTION public.restore_position(p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_receipt public.position_deletions%ROWTYPE;
BEGIN
  IF v_user IS NULL OR p_operation_id IS NULL THEN RAISE EXCEPTION 'POSITION_AUTH_OR_INPUT_INVALID'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text, 0));
  SELECT * INTO v_receipt FROM public.position_deletions
    WHERE operation_id = p_operation_id AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'POSITION_OPERATION_UNAVAILABLE'; END IF;
  IF v_receipt.restored_at IS NOT NULL THEN
    RETURN public.position_deletion_receipt(v_receipt);
  END IF;
  -- Check the real clock AFTER acquiring the row lock, never transaction-start now().
  -- Return an explicit refusal so the purge commits instead of rolling back with an exception.
  IF v_receipt.expires_at <= pg_catalog.clock_timestamp() OR v_receipt.snapshot IS NULL THEN
    UPDATE public.position_deletions SET snapshot = NULL, purged_at = COALESCE(purged_at, pg_catalog.clock_timestamp())
      WHERE operation_id = p_operation_id RETURNING * INTO v_receipt;
    RETURN public.position_deletion_receipt(v_receipt);
  END IF;
  -- Do not overwrite a newly created position or changed external dependencies.
  -- Missing brokers, duplicate symbols/IDs, or any child failure abort the entire restore.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_populate_recordset(NULL::public.transactions, v_receipt.snapshot->'transactions') t
    WHERE t.broker_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.brokers b WHERE b.id = t.broker_id AND b.user_id = v_user
    )
  ) THEN RAISE EXCEPTION 'POSITION_BROKER_UNAVAILABLE'; END IF;
  INSERT INTO public.assets SELECT * FROM pg_catalog.jsonb_populate_record(NULL::public.assets, v_receipt.snapshot->'asset');
  INSERT INTO public.transactions SELECT * FROM pg_catalog.jsonb_populate_recordset(NULL::public.transactions, v_receipt.snapshot->'transactions');
  INSERT INTO public.corporate_actions SELECT * FROM pg_catalog.jsonb_populate_recordset(NULL::public.corporate_actions, v_receipt.snapshot->'corporate_actions');
  INSERT INTO public.asset_valuations SELECT * FROM pg_catalog.jsonb_populate_recordset(NULL::public.asset_valuations, v_receipt.snapshot->'asset_valuations');
  -- Keep a small immutable receipt for idempotency, clear the private snapshot after Undo.
  UPDATE public.position_deletions SET restored_at = pg_catalog.clock_timestamp(), snapshot = NULL WHERE operation_id = p_operation_id RETURNING * INTO v_receipt;
  RETURN public.position_deletion_receipt(v_receipt);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_position(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_position(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_position(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_position(uuid) TO authenticated;
-- Owner-only recovery list, deliberately excluding financial payloads.
CREATE FUNCTION public.list_position_deletions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'POSITION_AUTH_OR_INPUT_INVALID'; END IF;
  RETURN COALESCE((SELECT pg_catalog.jsonb_agg(public.position_deletion_receipt(d) ORDER BY d.created_at DESC)
    FROM public.position_deletions d WHERE d.user_id = v_user AND d.restored_at IS NULL
      AND d.snapshot IS NOT NULL AND d.expires_at > pg_catalog.clock_timestamp()), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.list_position_deletions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_position_deletions() TO authenticated;

-- Scheduled service-only cleanup. Row locks coordinate with restore_position;
-- SKIP LOCKED leaves a running Undo alone. A later invocation picks up skipped rows.
CREATE FUNCTION public.purge_expired_position_deletions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count integer;
BEGIN
  WITH expired AS (
    SELECT operation_id FROM public.position_deletions
    WHERE snapshot IS NOT NULL AND expires_at <= pg_catalog.clock_timestamp()
    ORDER BY expires_at, operation_id FOR UPDATE SKIP LOCKED LIMIT 500
  )
  UPDATE public.position_deletions d SET snapshot = NULL, purged_at = pg_catalog.clock_timestamp()
    FROM expired e WHERE d.operation_id = e.operation_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_position_deletions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_position_deletions() TO service_role;
COMMIT;