-- English starter posts from the Capispot team (labelled on the wall via is_team). Re-running is safe.
INSERT INTO public.wall_posts (user_id, body, mood, tags, is_team)
SELECT a.user_id, v.body, v.mood, v.tags, true
FROM (SELECT user_id FROM public.site_admins ORDER BY 1 LIMIT 1) a
CROSS JOIN (VALUES
  ('Welcome to the wall! Share wins, doubts and questions here. You decide how much of your portfolio is visible: assets only, percentages, share counts or amounts.', 'chat', ARRAY['welcome']),
  ('Question of the week: what is the one rule you follow when investing — diversification, regular contributions, or something else?', 'question', ARRAY['question-of-the-week']),
  ('Tip: import a CSV from Trading 212 or Interactive Brokers under Transactions to see the FIFO tax-year report and the allocation by broker.', 'chat', ARRAY['tip'])
) AS v(body, mood, tags)
WHERE NOT EXISTS (SELECT 1 FROM public.wall_posts w WHERE w.is_team AND w.body = v.body);
