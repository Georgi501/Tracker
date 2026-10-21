import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Card } from "@/components/AppShell";
import { ProBadge } from "@/components/ProFeatures";

/** Community, profile sharing and chat are Pro features; the database enforces the same rule via is_pro(). */
export function CommunityUpsell({ lang }: { lang: string }) {
  const bg = lang === "bg";
  return (
    <Card className="mx-auto max-w-lg space-y-4 text-center">
      <span className="bg-brand-gradient mx-auto flex size-14 items-center justify-center rounded-2xl text-primary-foreground"><Users size={26} /></span>
      <div className="flex items-center justify-center gap-2"><h1 className="font-display text-xl font-bold">{bg ? "Общност на инвеститорите" : "Investor community"}</h1><ProBadge /></div>
      <p className="text-sm text-muted-foreground">{bg ? "Профил със снимка, свързване с други абонати, споделено портфолио и личен чат са включени в Pro." : "Profile with photo, connecting with other members, shared portfolios and private chat are included in Pro."}</p>
      <Link to="/pricing" className="press inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">{bg ? "Вземи Pro" : "Get Pro"}</Link>
    </Card>
  );
}
