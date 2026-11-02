import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio } from "@/lib/store";

const TEXT = {
  bg: (posts: number, members: number) =>
    `${posts} публикации през последните 30 дни · ${members} публични профила`,
  en: (posts: number, members: number) =>
    `${posts} posts in the last 30 days · ${members} public profiles`,
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
      {(p.lang === "bg" ? TEXT.bg : TEXT.en)(stats.posts, stats.members)}
    </p>
  );
}
