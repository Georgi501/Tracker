import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Card } from "@/components/AppShell";
import { ProBadge } from "@/components/ProFeatures";
import { planCopy } from "@/lib/plan-i18n";
import { proCopy } from "@/lib/pro-i18n";
import type { Lang } from "@/lib/i18n";

/** Community, profile sharing and chat are Pro features; the database enforces the same rule via is_pro(). */
export function CommunityUpsell({ lang }: { lang: Lang }) {
  return (
    <Card className="mx-auto max-w-lg space-y-4 text-center">
      <span className="bg-brand-gradient mx-auto flex size-14 items-center justify-center rounded-2xl text-primary-foreground">
        <Users size={26} />
      </span>
      <div className="flex items-center justify-center gap-2">
        <h1 className="font-display text-xl font-bold">{proCopy[lang].communityTitle}</h1>
        <ProBadge />
      </div>
      <p className="text-sm text-muted-foreground">{proCopy[lang].communityDesc}</p>
      <p className="text-xs text-muted-foreground">{planCopy[lang].freeRemains}</p>
      <Link
        to="/pricing"
        hash="plan-comparison"
        className="press inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        {planCopy[lang].comparePlans}
      </Link>
    </Card>
  );
}
