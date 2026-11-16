import { eventsCopy, type EventsCopy } from "./events-i18n";
import { languageLocale, type Lang } from "./i18n";
import type { PortfolioSmartEvent } from "./portfolio-events";

export function eventPresentation(
  event: PortfolioSmartEvent,
  lang: Lang,
  money: (usd: number) => string,
): { title: string; body: string; href: string | null } {
  const c: EventsCopy = eventsCopy[lang];
  const locale = languageLocale(lang);
  const day = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  if (event.kind === "ex_dividend_7d") {
    const when =
      event.daysUntil === 0
        ? c.today
        : event.daysUntil === 1
          ? c.tomorrow
          : c.inDays(event.daysUntil);
    const payout =
      event.totalUsd !== null && event.perShareUsd !== null
        ? `${c.perShare}: ${money(event.perShareUsd)} · ${c.total}: ${money(event.totalUsd)}`
        : c.amountUnavailable;
    return {
      title: c.exDividendTitle(event.symbol),
      body: c.exDividendBody(when, day(event.exDate), payout),
      href: null,
    };
  }
  return {
    title: c.secTitle(event.symbol),
    body: `${c.secBody(day(event.periodEnd), day(event.filed))} (${c.filedAgo(event.daysSinceFiled)})`,
    href: event.filingUrl,
  };
}
