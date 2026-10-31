CREATE TABLE public.broker_api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_id uuid NOT NULL UNIQUE REFERENCES public.brokers(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('ibkr', 'trading212')),
  encrypted_credentials text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_api_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.broker_api_credentials FROM anon, authenticated;
GRANT ALL ON public.broker_api_credentials TO service_role;

ALTER TABLE public.transactions
  ADD COLUMN source_transaction_id text;

CREATE UNIQUE INDEX transactions_broker_source_id_unique
  ON public.transactions (broker_id, source_transaction_id)
  WHERE source_transaction_id IS NOT NULL;
