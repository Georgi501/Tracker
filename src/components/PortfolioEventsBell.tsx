import { eventPresentation } from "@/lib/event-presentation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePortfolioEvents } from "@/hooks/use-portfolio-events";
import { eventsCopy } from "@/lib/events-i18n";
import { usePortfolio } from "@/lib/store";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

/** Header bell summarising confirmed ex-dividend dates (7 days) and fresh SEC 10-K filings. */
export function PortfolioEventsBell() {
  const p = usePortfolio();
  const c = eventsCopy[p.lang];
  const { events, signedIn } = usePortfolioEvents();
  if (!signedIn) return null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={c.bellLabel(events.length)}
          title={c.bellTitle}
          className="press relative grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Bell size={17} />
          {events.length > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground tabular-nums"
            >
              {events.length > 9 ? "9+" : events.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {c.bellTitle}
        </DropdownMenuLabel>
        {!events.length ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">{c.bellEmpty}</p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {events.slice(0, 8).map((event) => {
              const view = eventPresentation(event, p.lang, (usd) => p.money(usd));
              return (
                <li key={`${event.kind}-${event.symbol}`} className="px-2 py-2 text-sm">
                  <p className="font-semibold">{view.title}</p>
                  <p className="text-xs text-muted-foreground">{view.body}</p>
                </li>
              );
            })}
          </ul>
        )}
        <DropdownMenuSeparator />
        <Link
          to="/alerts"
          className="flex min-h-10 items-center px-2 text-sm font-semibold text-primary"
        >
          {c.bellViewAll}
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
