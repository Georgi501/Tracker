import { Card } from "@/components/AppShell";
import { eventsCopy } from "@/lib/events-i18n";
import type { Lang } from "@/lib/i18n";
import { languageLocale } from "@/lib/i18n";
import type { ConfirmedDividendCalendarMonth } from "@/lib/portfolio-events";

/** Presentational Confirmed Forward Dividend Calendar; never renders estimated payouts. */
export function ConfirmedDividendCalendar({
  months,
  lang,
  money,
  loading = false,
}: {
  months: ConfirmedDividendCalendarMonth[];
  lang: Lang;
  /** Formats a USD amount in the user's selected display currency. */
  money: (usd: number) => string;
  loading?: boolean;
}) {
  const c = eventsCopy[lang];
  const locale = languageLocale(lang);
  const day = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const monthLabel = (key: string) =>
    new Date(`${key}-01T00:00:00Z`).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  const per = (usd: number | null) => (usd === null ? c.amountUnavailable : money(usd));

  return (
    <section className="lg:col-span-3" aria-labelledby="confirmed-dividend-calendar">
      <Card>
        <h3 id="confirmed-dividend-calendar" className="font-display font-semibold">
          {c.calendarTitle}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{c.calendarDescription}</p>
        {!months.length ? (
          <p className="py-6 text-sm text-muted-foreground">{loading ? "…" : c.calendarEmpty}</p>
        ) : (
          <div className="mt-4 space-y-5">
            {months.map((month) => (
              <div key={month.monthKey}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-1.5">
                  <h4 className="text-sm font-semibold capitalize">{monthLabel(month.monthKey)}</h4>
                  {month.monthTotalUsd !== null && (
                    <span className="text-xs text-muted-foreground">
                      {c.monthTotal}:{" "}
                      <b className="font-semibold tabular-nums text-foreground">
                        {money(month.monthTotalUsd)}
                      </b>
                    </span>
                  )}
                </div>
                <ul className="divide-y divide-border/60">
                  {month.items.map((item) => (
                    <li
                      key={`${item.symbol}-${item.date}-${item.kind}`}
                      className="grid grid-cols-[6.5rem_1fr_auto] items-start gap-x-3 gap-y-1 py-2.5 text-sm"
                    >
                      <span className="tabular-nums text-muted-foreground">{day(item.date)}</span>
                      <span className="min-w-0">
                        <span className="font-semibold">{item.symbol}</span>{" "}
                        <span className="truncate text-muted-foreground">{item.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.kind === "payDate" ? c.payDate : c.exDate}
                          {item.companionDate ? ` · ${c.exDate}: ${day(item.companionDate)}` : ""}
                          {` · ${Number(item.quantity.toFixed(6))} ${c.shares}`}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums">
                          {per(item.totalUsd)}
                        </span>
                        {item.perShareUsd !== null && (
                          <span className="block text-xs tabular-nums text-muted-foreground">
                            {c.perShare}: {money(item.perShareUsd)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{c.calendarSource}</p>
      </Card>
    </section>
  );
}
