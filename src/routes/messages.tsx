import { EmptyState, ListSkeleton } from "@/components/SectionState";
import { uiStateCopy } from "@/lib/ui-state-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { usePortfolio } from "@/lib/store";
import { languageLocale, type Lang } from "@/lib/i18n";
import { CommunityUpsell } from "@/components/CommunityGate";
import { avatarUrls, cc, PROFILE_COLS, type MemberProfile } from "@/lib/community";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
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

const YOU: Record<string, string> = { en: "You", bg: "Ти", de: "Du", es: "Tú", it: "Tu" };

function formatWhen(iso: string, lang: Lang) {
  const d = new Date(iso);
  const locale = languageLocale(lang);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

interface Conv {
  other: string;
  last: string;
  at: string;
  mine: boolean;
  unread: number;
}

function Messages() {
  const p = usePortfolio();
  const c = cc(p.lang);
  const youLabel = YOU[p.lang] ?? "You";
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [people, setPeople] = useState<Record<string, MemberProfile>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (!p.user || !p.isPro) {
      setConvs(null);
      return;
    }
    let active = true;
    const me = p.user.id;
    setConvs(null);
    setLoadError(false);
    void (async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("sender_id, recipient_id, body, created_at, read_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const map = new Map<string, Conv>();
      for (const m of data ?? []) {
        const other = m.sender_id === me ? m.recipient_id : m.sender_id;
        const cv = map.get(other) ?? {
          other,
          last: m.body,
          at: m.created_at,
          mine: m.sender_id === me,
          unread: 0,
        };
        if (m.recipient_id === me && !m.read_at) cv.unread++;
        map.set(other, cv);
      }
      const list = [...map.values()];
      const { data: profs, error: profileError } = list.length
        ? await supabase
            .from("profiles")
            .select(PROFILE_COLS)
            .in(
              "id",
              list.map((x) => x.other),
            )
        : { data: [], error: null };
      if (profileError) throw profileError;
      const rows = (profs ?? []) as MemberProfile[];
      const signedUrls = await avatarUrls(rows.map((r) => r.avatar_path));
      if (active) {
        setConvs(list);
        setPeople(Object.fromEntries(rows.map((r) => [r.id, r])));
        setUrls(signedUrls);
      }
    })().catch((error: unknown) => {
      console.error("Unable to load conversations", error);
      if (active) setLoadError(true);
    });
    return () => {
      active = false;
    };
  }, [p.user, p.isPro, reloadKey]);
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
      ) : convs === null ? (
        <ListSkeleton label={c.loading} />
      ) : !convs.length ? (
        <EmptyState
          icon="messages"
          title={c.noChats}
          description={uiStateCopy[p.lang].messagesHelp}
          action={
            <Link
              to="/community"
              className="press min-h-11 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {c.community} →
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {convs.map((cv) => {
            const who = people[cv.other];
            return (
              <Link
                key={cv.other}
                to="/community/$userId"
                params={{ userId: cv.other }}
                className={`card-interactive flex items-center gap-3 rounded-2xl border bg-card p-3 hover:border-primary/40 ${cv.unread > 0 ? "border-primary/50" : "border-border"}`}
              >
                <Avatar
                  url={who?.avatar_path ? urls[who.avatar_path] : undefined}
                  name={who?.display_name}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{who?.display_name || "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {cv.mine && <span className="font-medium">{youLabel}: </span>}
                    {cv.last}
                  </p>
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
