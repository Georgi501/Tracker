import { Card } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { CommunityUpsell } from "@/components/CommunityGate";
import { EmptyState, ListSkeleton } from "@/components/SectionState";
import { supabase } from "@/integrations/supabase/client";
import { avatarUrls, cc, PROFILE_COLS, type MemberProfile } from "@/lib/community";
import { usePortfolio } from "@/lib/store";
import { uiStateCopy } from "@/lib/ui-state-copy";
import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { MessageCircle, Newspaper, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Community — CapiSpot" },
      {
        name: "description",
        content:
          "CapiSpot Pro community: meet other investors, view opt-in shared portfolios as percentages only, and chat one-to-one.",
      },
      { property: "og:title", content: "Community — CapiSpot" },
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
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (!p.user || !p.isPro) {
      setList(null);
      return;
    }
    let active = true;
    setList(null);
    setLoadError(false);
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLS)
        .eq("is_public", true)
        .neq("id", p.user!.id)
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as MemberProfile[];
      const signedUrls = await avatarUrls(rows.map((r) => r.avatar_path));
      if (active) {
        setList(rows);
        setUrls(signedUrls);
      }
    })().catch((error: unknown) => {
      console.error("Unable to load community directory", error);
      if (active) setLoadError(true);
    });
    return () => {
      active = false;
    };
  }, [p.user, p.isPro, reloadKey]);
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
            to="/wall"
            className="press flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
          >
            <Newspaper size={16} />
            {c.wall}
          </Link>
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
        aria-label={c.search}
        className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {loadError ? (
        <div role="alert">
          <Card className="text-center">
            <p className="text-sm text-muted-foreground">{c.loadError}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {c.retry}
            </button>
          </Card>
        </div>
      ) : list === null ? (
        <ListSkeleton label={c.loading} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="community"
          title={q.trim() ? uiStateCopy[p.lang].noMatches : c.none}
          description={q.trim() ? uiStateCopy[p.lang].searchHelp : uiStateCopy[p.lang].membersHelp}
          action={
            q.trim() ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="press min-h-11 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                {uiStateCopy[p.lang].reset}
              </button>
            ) : (
              <Link
                to="/profile"
                className="press min-h-11 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                {c.profile}
              </Link>
            )
          }
        />
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
