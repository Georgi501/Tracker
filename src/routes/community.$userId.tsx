import { Card } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { ChatThread } from "@/components/ChatThread";
import { CommunityUpsell } from "@/components/CommunityGate";
import { PortfolioSnapshot, type SnapshotRow } from "@/components/PortfolioSnapshot";
import { ListSkeleton } from "@/components/SectionState";
import { supabase } from "@/integrations/supabase/client";
import { avatarUrls, cc, PROFILE_COLS, type MemberProfile } from "@/lib/community";
import { usePortfolio } from "@/lib/store";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/community/$userId")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Investor profile — CapiSpot" },
      { name: "description", content: "Investor profile, shared portfolio and chat." },
      { property: "og:title", content: "Investor profile — CapiSpot" },
      { property: "og:description", content: "See a member's profile and portfolio" },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Member,
});

function Member() {
  const { userId } = Route.useParams();
  const p = usePortfolio();
  const c = cc(p.lang);
  const [m, setM] = useState<MemberProfile | null | undefined>();
  const [url, setUrl] = useState<string>();
  const [weights, setWeights] = useState<SnapshotRow[]>([]);
  useEffect(() => {
    if (!p.user) return;
    void supabase
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", userId)
      .maybeSingle()
      .then(async ({ data }) => {
        const prof = data as MemberProfile | null;
        setM(prof);
        if (prof?.avatar_path) setUrl((await avatarUrls([prof.avatar_path]))[prof.avatar_path]);
        if (prof?.share_portfolio) {
          const r = await supabase.rpc("public_portfolio", { _user_id: userId });
          setWeights((r.data ?? []) as SnapshotRow[]);
        }
      });
  }, [p.user, userId]);
  if (!p.user)
    return (
      <Card className="mx-auto max-w-lg text-center">
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
  if (m === undefined)
    return (
      <div className="mx-auto max-w-xl">
        <ListSkeleton label={c.loading} />
      </div>
    );
  if (!m) return <Card className="mx-auto max-w-lg text-center">{c.none}</Card>;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/community"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft size={16} />
        {c.community}
      </Link>
      <Card className="flex items-center gap-4">
        <Avatar url={url} name={m.display_name} size={72} />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">{m.display_name || "—"}</h1>
          {m.investing_style && <p className="text-sm text-primary">{m.investing_style}</p>}
          {m.bio && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{m.bio}</p>
          )}
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">{c.portfolio}</h2>
        {!m.share_portfolio || !weights.length ? (
          <p className="text-sm text-muted-foreground">{c.private}</p>
        ) : (
          <PortfolioSnapshot rows={weights} lang={p.lang} />
        )}
      </Card>
      {m.id !== p.user.id && (
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">{c.message}</h2>
          <ChatThread me={p.user.id} other={m.id} lang={p.lang} />
        </div>
      )}
    </div>
  );
}
