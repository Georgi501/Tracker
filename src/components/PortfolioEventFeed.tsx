import { Card } from "@/components/AppShell";
import { usePortfolioEvents } from "@/hooks/use-portfolio-events";
import { eventPresentation } from "@/lib/event-presentation";
import { eventsCopy } from "@/lib/events-i18n";
import { usePortfolio } from "@/lib/store";
import { CalendarClock, FileText } from "lucide-react";

/** Smart event feed shown next to manual price alerts. */
export function PortfolioEventFeed() {
  const p = usePortfolio();
  const c = eventsCopy[p.lang];
  const { events, loading, signedIn } = usePortfolioEvents();
  if (!signedIn) return null;
  return (
    <Card>
      <h2 className="font-display font-semibold">{c.feedTitle}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{c.feedDescription}</p>
      {!events.length ? (
        <p className="py-4 text-sm text-muted-foreground">
          {loading ? c.feedLoading : c.feedEmpty}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {events.map((event) => {
            const view = eventPresentation(event, p.lang, (usd) => p.money(usd));
            const Icon = event.kind === "ex_dividend_7d" ? CalendarClock : FileText;
            return (
              <li
                key={`${event.kind}-${event.symbol}`}
                className="flex items-start gap-3 py-3 text-sm"
              >
                <Icon size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-semibold">{view.title}</p>
                  <p className="text-muted-foreground">{view.body}</p>
                  {view.href && (
                    <a
                      href={view.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex min-h-8 items-center text-xs font-semibold text-primary underline underline-offset-4"
                    >
                      {c.viewFiling}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{c.feedSource}</p>
    </Card>
  );
}
