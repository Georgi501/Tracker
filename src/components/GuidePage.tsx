import { Link } from "@tanstack/react-router";
import { Card } from "@/components/AppShell";
import { RelatedGuides } from "@/components/RelatedGuides";
import { usePortfolio } from "@/lib/store";

export type GuideCopy = {
  title: string;
  intro: string;
  sections: [string, string][];
  cta: string;
  note: string;
};

export function GuidePage({
  path,
  copy,
  to,
}: {
  path: string;
  copy: Record<"en" | "bg", GuideCopy>;
  to: "/brokers" | "/dividends" | "/tools";
}) {
  const p = usePortfolio();
  const g = p.lang === "bg" ? copy.bg : copy.en;
  return (
    <div className="page-enter mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-balance text-3xl font-bold">{g.title}</h1>
      <p className="text-muted-foreground">{g.intro}</p>
      <Card>
        <div className="space-y-5">
          {g.sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="font-display text-lg font-semibold">{h}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={to}
          className="press rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {g.cta}
        </Link>
        <p className="text-xs text-muted-foreground">{g.note}</p>
      </div>
      <RelatedGuides current={path} />
    </div>
  );
}
