import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";

const TEXT: Record<string, (posts: number, members: number) => string> = {
  bg: (posts, members) =>
    `${posts} публикации през последните 30 дни · ${members} публични профила`,
  en: (posts, members) => `${posts} posts in the last 30 days · ${members} public profiles`,
  de: (posts, members) =>
    `${posts} Beiträge in den letzten 30 Tagen · ${members} öffentliche Profile`,
  es: (posts, members) =>
    `${posts} publicaciones en los últimos 30 días · ${members} perfiles públicos`,
  it: (posts, members) => `${posts} post negli ultimi 30 giorni · ${members} profili pubblici`,
};
/** Shows only aggregate counts to signed-in members; no post content or names are exposed. */
export function WallTeaser() {
  const p = usePortfolio();
  const [stats, setStats] = useState<{ posts: number; members: number } | null>(null);
  useEffect(() => {
    if (!p.user) return;
    let active = true;
    void (supabase as unknown as SupabaseClient).rpc("wall_stats").then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (active && row) setStats({ posts: Number(row.posts), members: Number(row.members) });
    });
    return () => {
      active = false;
    };
  }, [p.user]);
  if (!stats) return null;
  return (
    <p className="text-xs font-medium text-primary tabular-nums">
      {(TEXT[p.lang] ?? TEXT["en"])?.(stats.posts, stats.members)}
    </p>
  );
}
