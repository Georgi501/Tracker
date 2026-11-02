CREATE TABLE public.corporate_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  numerator numeric NOT NULL CHECK (numerator > 0),
  denominator numeric NOT NULL CHECK (denominator > 0),
  source text NOT NULL DEFAULT 'yahoo' CHECK (source = 'yahoo'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, asset_id, event_date, numerator, denominator)
);

ALTER TABLE public.corporate_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.corporate_actions FROM anon, authenticated;
GRANT SELECT ON public.corporate_actions TO authenticated;
GRANT ALL ON public.corporate_actions TO service_role;
CREATE POLICY "own corporate actions select" ON public.corporate_actions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX corporate_actions_user_asset_date_idx
  ON public.corporate_actions (user_id, asset_id, event_date);

CREATE TABLE public.asset_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  valuation_date date NOT NULL,
  price_usd numeric NOT NULL CHECK (price_usd > 0),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, asset_id, valuation_date)
);

ALTER TABLE public.asset_valuations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_valuations TO authenticated;
GRANT ALL ON public.asset_valuations TO service_role;
CREATE POLICY "own manual asset valuations" ON public.asset_valuations
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.assets
      WHERE assets.id = asset_valuations.asset_id
        AND assets.user_id = auth.uid()
        AND assets.type IN ('bond', 'realEstate')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.assets
      WHERE assets.id = asset_valuations.asset_id
        AND assets.user_id = auth.uid()
        AND assets.type IN ('bond', 'realEstate')
    )
  );
CREATE INDEX asset_valuations_user_asset_date_idx
  ON public.asset_valuations (user_id, asset_id, valuation_date DESC);
