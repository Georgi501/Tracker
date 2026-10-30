import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { usePortfolio } from "@/lib/store";
import { CommunityUpsell } from "@/components/CommunityGate";
import { avatarUrls, cc, PROFILE_COLS, type MemberProfile } from "@/lib/community";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — Capispot" },
      { name: "description", content: "Meet other investors, view shared portfolios and chat." },
      { property: "og:title", content: "Community — Capispot" },
      { property: "og:description", content: "Investor profiles and private chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Community,
});

function Community() {
  const child = useMatch({ from: "/community/$userId", shouldThrow: false });
  return child ? <Outlet /> : <Directory />;
}

function Directory() {
  const p = usePortfolio();
  const c = cc(p.lang);
  const [list, setList] = useState<MemberProfile[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!p.user) return;
    void supabase
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("is_public", true)
      .neq("id", p.user.id)
      .limit(200)
      .then(async ({ data }) => {
        const rows = (data ?? []) as MemberProfile[];
        setList(rows);
        setUrls(await avatarUrls(rows.map((r) => r.avatar_path)));
      });
  }, [p.user]);
  if (!p.user)
    return (
      <Card className="mx-auto max-w-lg text-center">
        <h1 className="font-display mb-4 text-2xl font-bold">{c.community}</h1>
        <p className="mb-4">{c.signIn}</p>
        <Link
          to="/auth"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {p.t("signIn")}
        </Link>
      </Card>
    );
  if (!p.isPro) return <CommunityUpsell lang={p.lang} />;
  const shown = (list ?? []).filter((m) =>
    `${m.display_name} ${m.investing_style} ${m.bio}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{c.community}</h1>
        <div className="flex gap-2">
          <Link
            to="/messages"
            className="press flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold"
          >
            <MessageCircle size={16} />
            {c.messages}
          </Link>
          <Link
            to="/profile"
            className="press flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <UserRound size={16} />
            {c.profile}
          </Link>
        </div>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={c.search}
        className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {list === null ? (
        <div className="h-40 animate-pulse rounded-3xl" />
      ) : shown.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          {c.none}
          <br />
          {c.makePublic}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((m) => (
            <Link
              key={m.id}
              to="/community/$userId"
              params={{ userId: m.id }}
              className="card-interactive flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <Avatar url={m.avatar_path ? urls[m.avatar_path] : undefined} name={m.display_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.display_name || "—"}</p>
                {m.investing_style && (
                  <p className="truncate text-xs text-primary">{m.investing_style}</p>
                )}
                <p className="line-clamp-2 text-xs text-muted-foreground">{m.bio}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
