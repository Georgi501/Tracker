CREATE TABLE public.broker_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  from_broker_id uuid NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  to_broker_id uuid NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  quantity numeric NOT NULL CHECK (quantity > 0),
  transfer_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_broker_id <> to_broker_id)
);

ALTER TABLE public.broker_transfers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.broker_transfers FROM anon, authenticated;
GRANT SELECT ON public.broker_transfers TO authenticated;
GRANT ALL ON public.broker_transfers TO service_role;
CREATE POLICY "own broker transfers select" ON public.broker_transfers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX broker_transfers_user_asset_date_idx
  ON public.broker_transfers (user_id, asset_id, transfer_date, created_at);

CREATE OR REPLACE FUNCTION public.create_broker_transfer(
  p_asset_id uuid,
  p_from_broker_id uuid,
  p_to_broker_id uuid,
  p_quantity numeric,
  p_transfer_date date
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_transfer_id uuid;
  v_balance numeric := 0;
  v_check_broker_id uuid;
  v_event record;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BROKER_TRANSFER_SIGN_IN_REQUIRED';
  END IF;
  IF p_quantity IS NULL OR p_quantity::text IN ('NaN', 'Infinity', '-Infinity') OR p_quantity <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BROKER_TRANSFER_INVALID_QUANTITY';
  END IF;
  IF p_transfer_date IS NULL OR p_transfer_date > current_date + 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BROKER_TRANSFER_INVALID_DATE';
  END IF;
  IF p_from_broker_id IS NULL OR p_to_broker_id IS NULL OR p_from_broker_id = p_to_broker_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BROKER_TRANSFER_INVALID_BROKERS';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.assets
    WHERE id = p_asset_id AND user_id = v_user_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.brokers
    WHERE id = p_from_broker_id AND user_id = v_user_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.brokers
    WHERE id = p_to_broker_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BROKER_TRANSFER_INVALID_OWNER';
  END IF;

  FOR v_check_broker_id IN
    SELECT ids.broker_id
    FROM unnest(ARRAY[p_from_broker_id, p_to_broker_id]) AS ids(broker_id)
    ORDER BY ids.broker_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        v_user_id::text || p_asset_id::text || v_check_broker_id::text,
        0
      )
    );
  END LOOP;

  FOREACH v_check_broker_id IN ARRAY ARRAY[p_from_broker_id, p_to_broker_id]
  LOOP
    v_balance := 0;
    FOR v_event IN
      WITH ledger AS (
        SELECT
          action.event_date AS event_date,
          0 AS event_order,
          action.numerator AS split_numerator,
          action.denominator AS split_denominator,
          NULL::numeric AS quantity_delta,
          NULL::timestamptz AS created_at,
          action.id::text AS event_id
        FROM public.corporate_actions AS action
        WHERE action.user_id = v_user_id AND action.asset_id = p_asset_id
        UNION ALL
        SELECT
          tx.date,
          1,
          NULL::numeric,
          NULL::numeric,
          sum(CASE WHEN tx.kind = 'buy' THEN tx.quantity ELSE -tx.quantity END),
          NULL::timestamptz,
          ''
        FROM public.transactions AS tx
        WHERE tx.user_id = v_user_id
          AND tx.asset_id = p_asset_id
          AND tx.broker_id = v_check_broker_id
          AND tx.kind IN ('buy', 'sell')
        GROUP BY tx.date
        UNION ALL
        SELECT
          transfer.transfer_date,
          2,
          NULL::numeric,
          NULL::numeric,
          CASE
            WHEN transfer.from_broker_id = v_check_broker_id THEN -transfer.quantity
            ELSE transfer.quantity
          END,
          transfer.created_at,
          transfer.id::text
        FROM public.broker_transfers AS transfer
        WHERE transfer.user_id = v_user_id
          AND transfer.asset_id = p_asset_id
          AND (
            transfer.from_broker_id = v_check_broker_id
            OR transfer.to_broker_id = v_check_broker_id
          )
        UNION ALL
        SELECT
          p_transfer_date,
          2,
          NULL::numeric,
          NULL::numeric,
          CASE
            WHEN v_check_broker_id = p_from_broker_id THEN -p_quantity
            ELSE p_quantity
          END,
          v_now,
          'proposed'
      )
      SELECT *
      FROM ledger
      ORDER BY event_date, event_order, created_at NULLS FIRST, event_id
    LOOP
      IF v_event.event_order = 0 THEN
        v_balance := v_balance * v_event.split_numerator / v_event.split_denominator;
      ELSE
        v_balance := v_balance + v_event.quantity_delta;
      END IF;
      IF v_balance < -0.000000001 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BROKER_TRANSFER_INSUFFICIENT_SHARES';
      END IF;
    END LOOP;
  END LOOP;

  INSERT INTO public.broker_transfers (
    user_id,
    asset_id,
    from_broker_id,
    to_broker_id,
    quantity,
    transfer_date,
    created_at
  ) VALUES (
    v_user_id,
    p_asset_id,
    p_from_broker_id,
    p_to_broker_id,
    p_quantity,
    p_transfer_date,
    v_now
  )
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_broker_transfer(uuid, uuid, uuid, numeric, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_broker_transfer(uuid, uuid, uuid, numeric, date) TO authenticated;
