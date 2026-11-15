-- One scalar JSON response: PostgREST max_rows cannot truncate nested arrays.
-- STABLE keeps every input on the calling statement's MVCC snapshot.
BEGIN;
CREATE FUNCTION public.portfolio_snapshot()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'assets', COALESCE((SELECT jsonb_agg(r ORDER BY r.id) FROM public.assets r WHERE r.user_id = (SELECT auth.uid())), '[]'::jsonb),
    'transactions', COALESCE((SELECT jsonb_agg(r ORDER BY r.date, r.created_at, r.id) FROM public.transactions r WHERE r.user_id = (SELECT auth.uid())), '[]'::jsonb),
    'brokers', COALESCE((SELECT jsonb_agg(r ORDER BY r.created_at, r.id) FROM public.brokers r WHERE r.user_id = (SELECT auth.uid())), '[]'::jsonb),
    'broker_transfers', COALESCE((SELECT jsonb_agg(r ORDER BY r.transfer_date, r.created_at, r.id) FROM public.broker_transfers r WHERE r.user_id = (SELECT auth.uid())), '[]'::jsonb),
    'corporate_actions', COALESCE((SELECT jsonb_agg(r ORDER BY r.event_date, r.id) FROM public.corporate_actions r WHERE r.user_id = (SELECT auth.uid())), '[]'::jsonb),
    'asset_valuations', COALESCE((SELECT jsonb_agg(r ORDER BY r.valuation_date, r.id) FROM public.asset_valuations r WHERE r.user_id = (SELECT auth.uid())), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.portfolio_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portfolio_snapshot() TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
