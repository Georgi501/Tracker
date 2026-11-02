-- Editorial posts from the Capispot team, clearly labelled on the wall.
-- Members can only create posts through create_wall_post(), which never sets is_team,
-- so the flag can be set only by an administrator with direct database access.
ALTER TABLE public.wall_posts ADD COLUMN IF NOT EXISTS is_team boolean NOT NULL DEFAULT false;

-- Starter posts, authored by the first site administrator. Re-running is safe.
INSERT INTO public.wall_posts (user_id, body, mood, tags, is_team)
SELECT a.user_id, v.body, v.mood, v.tags, true
FROM (SELECT user_id FROM public.site_admins ORDER BY 1 LIMIT 1) a
CROSS JOIN (VALUES
  ('Добре дошли на стената! Тук можете да споделяте успехи, съмнения и въпроси. Сами избирате колко от портфолиото да се вижда: само активите, процентите, броя дялове или сумите.', 'chat', ARRAY['добре-дошли']),
  ('Въпрос на седмицата: какво е най-важното правило, което следвате при инвестиране — диверсификация, редовни вноски или нещо друго?', 'question', ARRAY['въпрос-на-седмицата']),
  ('Съвет: импортирайте CSV от Trading 212 или Interactive Brokers в раздел „Транзакции“, за да видите FIFO справката за данъчната година и разпределението по брокер.', 'chat', ARRAY['съвет'])
) AS v(body, mood, tags)
WHERE NOT EXISTS (SELECT 1 FROM public.wall_posts w WHERE w.is_team AND w.body = v.body);
