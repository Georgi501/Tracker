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
