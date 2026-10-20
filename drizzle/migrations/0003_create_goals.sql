CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  target numeric NOT NULL CHECK (target > 0),
  target_date date NOT NULL,
  monthly numeric NOT NULL DEFAULT 0 CHECK (monthly >= 0),
  annual_return numeric NOT NULL DEFAULT 6 CHECK (annual_return BETWEEN -50 AND 50),
  currency text NOT NULL CHECK (currency IN ('EUR','USD')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own goals select" ON public.goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own goals insert" ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own goals update" ON public.goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own goals delete" ON public.goals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX goals_user_idx ON public.goals(user_id);