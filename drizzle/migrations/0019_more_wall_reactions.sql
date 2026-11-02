-- Widen the allowed wall reactions from 6 to 16.
ALTER TABLE public.wall_reactions DROP CONSTRAINT IF EXISTS wall_reactions_emoji_check;
ALTER TABLE public.wall_reactions ADD CONSTRAINT wall_reactions_emoji_check
  CHECK (emoji IN ('🚀', '👏', '🔥', '💪', '🤝', '😢', '👍', '❤️', '😂', '😮', '🤔', '💎', '🐂', '🐻', '🎉', '🙏'));
