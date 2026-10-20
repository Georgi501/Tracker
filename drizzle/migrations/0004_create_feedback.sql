CREATE TABLE public.feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 category text NOT NULL CHECK (category IN ('idea', 'bug', 'other')),
 message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 10 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users submit own feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users read own feedback" ON public.feedback FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE INDEX feedback_user_created_idx ON public.feedback (user_id, created_at DESC);