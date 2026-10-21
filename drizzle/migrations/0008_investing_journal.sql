CREATE TABLE public.journal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  symbol text NOT NULL,
  thesis text NOT NULL DEFAULT '',
  horizon text NOT NULL DEFAULT '',
  review_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_notes TO authenticated;
GRANT ALL ON public.journal_notes TO service_role;
ALTER TABLE public.journal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal" ON public.journal_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);