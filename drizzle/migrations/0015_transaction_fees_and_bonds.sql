ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS fee numeric NOT NULL DEFAULT 0
    CHECK (fee >= 0);

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS bond_coupon_rate numeric,
  ADD COLUMN IF NOT EXISTS bond_maturity_date date,
  ADD COLUMN IF NOT EXISTS bond_face_value numeric;
