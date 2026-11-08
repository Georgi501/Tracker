CREATE TABLE public.live_exchange_rates (
  pair text PRIMARY KEY CHECK (pair = 'EURUSD'),
  eur_per_usd double precision NOT NULL CHECK (eur_per_usd > 0),
  quote_at timestamptz NOT NULL,
  source text NOT NULL CHECK (source = 'Yahoo Finance')
);

ALTER TABLE public.live_exchange_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_exchange_rates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.live_exchange_rates TO service_role;

CREATE FUNCTION public.save_live_eurusd(
  rate double precision,
  observed_at timestamptz,
  provider text
) RETURNS SETOF public.live_exchange_rates
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.live_exchange_rates AS existing (pair, eur_per_usd, quote_at, source)
  VALUES ('EURUSD', rate, observed_at, provider)
  ON CONFLICT (pair) DO UPDATE
    SET eur_per_usd = EXCLUDED.eur_per_usd,
        quote_at = EXCLUDED.quote_at,
        source = EXCLUDED.source
    WHERE EXCLUDED.quote_at >= existing.quote_at;
  RETURN QUERY SELECT * FROM public.live_exchange_rates WHERE pair = 'EURUSD';
END;
$$;

REVOKE ALL ON FUNCTION public.save_live_eurusd(double precision, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_live_eurusd(double precision, timestamptz, text)
  TO service_role;
