DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'paddle_subscription_id'
  ) THEN
    EXECUTE $migration$
      UPDATE public.subscriptions
      SET status = 'expired',
          cancel_at_period_end = true,
          updated_at = now()
      WHERE paddle_subscription_id IS NOT NULL
    $migration$;
  END IF;
END $$;

ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS paddle_subscription_id,
  DROP COLUMN IF EXISTS paddle_customer_id,
  ADD COLUMN IF NOT EXISTS provider_customer_id text,
  ALTER COLUMN environment SET DEFAULT 'sandbox';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND conname = 'subscriptions_provider_subscription_id_key'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_provider_subscription_id_key UNIQUE (provider_subscription_id);
  END IF;
END $$;
