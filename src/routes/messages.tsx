import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { usePortfolio } from "@/lib/store";
import { CommunityUpsell } from "@/components/CommunityGate";
import { avatarUrls, cc, PROFILE_COLS, type MemberProfile } from "@/lib/community";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Capispot" },
      { name: "description", content: "Your private conversations with other investors." },
      { property: "og:title", content: "Messages — Capispot" },
      { property: "og:description", content: "Private investor chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Messages,
});

interface Conv {
  other: string;
  last: string;
  at: string;
  unread: number;
}

function Messages() {
  const p = usePortfolio();
  const c = cc(p.lang);
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [people, setPeople] = useState<Record<string, MemberProfile>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!p.user) return;
    const me = p.user.id;
    void supabase
      .from("direct_messages")
      .select("sender_id, recipient_id, body, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(async ({ data }) => {
        const map = new Map<string, Conv>();
        for (const m of data ?? []) {
          const other = m.sender_id === me ? m.recipient_id : m.sender_id;
          const cv = map.get(other) ?? { other, last: m.body, at: m.created_at, unread: 0 };
          if (m.recipient_id === me && !m.read_at) cv.unread++;
          map.set(other, cv);
        }
        const list = [...map.values()];
        setConvs(list);
        if (!list.length) return;
        const { data: profs } = await supabase
          .from("profiles")
          .select(PROFILE_COLS)
          .in(
            "id",
            list.map((x) => x.other),
          );
        const rows = (profs ?? []) as MemberProfile[];
        setPeople(Object.fromEntries(rows.map((r) => [r.id, r])));
        setUrls(await avatarUrls(rows.map((r) => r.avatar_path)));
      });
  }, [p.user]);
  if (!p.user)
    return (
      <Card className="mx-auto max-w-lg text-center">
        <h1 className="font-display mb-4 text-2xl font-bold">{c.messages}</h1>
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
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-bold">{c.messages}</h1>
      {convs === null ? (
        <div className="h-40 animate-pulse rounded-3xl" />
      ) : !convs.length ? (
        <Card className="text-center text-sm text-muted-foreground">
          {c.noChats}{" "}
          <Link to="/community" className="font-semibold text-primary">
            {c.community} →
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {convs.map((cv) => {
            const who = people[cv.other];
            return (
              <Link
                key={cv.other}
                to="/community/$userId"
                params={{ userId: cv.other }}
                className="card-interactive flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <Avatar
                  url={who?.avatar_path ? urls[who.avatar_path] : undefined}
                  name={who?.display_name}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{who?.display_name || "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{cv.last}</p>
                </div>
                {cv.unread > 0 && (
                  <span className="bg-brand-gradient rounded-full px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {cv.unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
