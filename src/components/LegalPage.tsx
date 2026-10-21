import { Card } from "@/components/AppShell";
import { usePortfolio } from "@/lib/store";
import { legalCopy, SUPPORT_EMAIL, type LegalKey } from "@/lib/legal";

export function LegalPage({ doc }: { doc: LegalKey }) {
  const p = usePortfolio();
  const c = legalCopy(p.lang);
  const d = c[doc];
  return (
    <div className="page-enter mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold">{d.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{d.updated}</p>
      </div>
      <Card>
        <div className="space-y-5">
          {d.sections.map(([h, body]) => (
            <section key={h}>
              <h2 className="font-display text-lg font-semibold">{h}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </section>
          ))}
          <p className="border-t border-border pt-4 text-sm">{c.footer.contact}: {SUPPORT_EMAIL ? <a className="font-semibold text-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : <span className="text-muted-foreground">{c.footer.emailSoon}</span>}</p>
        </div>
      </Card>
    </div>
  );
}
