import type { DividendInfo, SecFilingEvent } from "./dividends.functions";
import type { Holding } from "./portfolio";

export interface ConfirmedDividendCalendarItem {
  symbol: string;
  name: string;
  date: string;
  kind: "exDate" | "payDate";
  companionDate: string | null;
  quantity: number;
  perShareUsd: number | null;
  totalUsd: number | null;
}

export interface ConfirmedDividendCalendarMonth {
  monthKey: string;
  items: ConfirmedDividendCalendarItem[];
  monthTotalUsd: number | null;
}

export interface ExDividendSmartEvent {
  kind: "ex_dividend_7d";
  symbol: string;
  name: string;
  exDate: string;
  payDate: string | null;
  daysUntil: number;
  quantity: number;
  perShareUsd: number | null;
  totalUsd: number | null;
}

export interface SecFilingSmartEvent {
  kind: "sec_10k_filed";
  symbol: string;
  name: string;
  periodEnd: string;
  filed: string;
  daysSinceFiled: number;
  filingUrl: string;
}

export type PortfolioSmartEvent = ExDividendSmartEvent | SecFilingSmartEvent;

function parseIsoDayMs(value: string | null | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) return null;
  return ms;
}

function latestConfirmedAmountPerShare(paid: { date: string; amount: number }[]): number | null {
  const valid = paid
    .filter(
      (entry) =>
        parseIsoDayMs(entry.date) !== null && Number.isFinite(entry.amount) && entry.amount > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  return valid.at(-1)?.amount ?? null;
}

/**
 * Builds a chronological Confirmed Forward Dividend Calendar grouped by month (YYYY-MM).
 * Guardrail (AGENTS.md): Uses only confirmed Yahoo event dates and confirmed payouts; never estimates.
 */
export function buildConfirmedDividendCalendar(
  holdings: Pick<Holding, "asset" | "quantity">[],
  events: DividendInfo[],
  toUsd: (amount: number, currency: string | null) => number,
): ConfirmedDividendCalendarMonth[] {
  const bySymbol = new Map(events.map((event) => [event.symbol.toUpperCase(), event]));
  const items: ConfirmedDividendCalendarItem[] = [];

  for (const holding of holdings) {
    if (
      !Number.isFinite(holding.quantity) ||
      holding.quantity <= 0 ||
      (holding.asset.type !== "stock" && holding.asset.type !== "etf")
    ) {
      continue;
    }
    const info = bySymbol.get(holding.asset.symbol.toUpperCase());
    if (!info) continue;

    const exValid = parseIsoDayMs(info.exDate) !== null ? info.exDate! : null;
    const payValid = parseIsoDayMs(info.payDate) !== null ? info.payDate! : null;
    if (!exValid && !payValid) continue;

    const rawPerShare = latestConfirmedAmountPerShare(info.paid);
    const convertedPerShare = rawPerShare !== null ? toUsd(rawPerShare, info.currency) : Number.NaN;
    const perShareUsd =
      Number.isFinite(convertedPerShare) && convertedPerShare > 0 ? convertedPerShare : null;
    const totalUsd = perShareUsd !== null ? perShareUsd * holding.quantity : null;

    const primaryDate = (payValid ?? exValid)!;
    const primaryKind: "exDate" | "payDate" = payValid ? "payDate" : "exDate";
    const companionDate = payValid && exValid && payValid !== exValid ? exValid : null;

    items.push({
      symbol: holding.asset.symbol,
      name: holding.asset.name,
      date: primaryDate,
      kind: primaryKind,
      companionDate,
      quantity: holding.quantity,
      perShareUsd,
      totalUsd,
    });
  }

  items.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

  const months = new Map<string, ConfirmedDividendCalendarItem[]>();
  for (const item of items) {
    const monthKey = item.date.slice(0, 7);
    const list = months.get(monthKey) ?? [];
    list.push(item);
    months.set(monthKey, list);
  }

  return [...months.entries()].map(([monthKey, monthItems]) => {
    const pricedItems = monthItems.filter((item) => item.totalUsd !== null);
    const monthTotalUsd =
      pricedItems.length > 0
        ? pricedItems.reduce((sum, item) => sum + (item.totalUsd ?? 0), 0)
        : null;
    return {
      monthKey,
      items: monthItems,
      monthTotalUsd,
    };
  });
}

/**
 * Surfaces upcoming confirmed Ex-Dividend dates within 7 days and newly filed SEC 10-K reports
 * for owned portfolio positions.
 */
export function buildSmartPortfolioEvents({
  holdings,
  dividendEvents,
  secFilings,
  asOfDate = new Date().toISOString().slice(0, 10),
  toUsd = (amount, currency) => (currency === "USD" ? amount : Number.NaN),
  exDividendWindowDays = 7,
  secFilingWindowDays = 60,
}: {
  holdings: Pick<Holding, "asset" | "quantity">[];
  dividendEvents: DividendInfo[];
  secFilings: SecFilingEvent[];
  asOfDate?: string;
  toUsd?: (amount: number, currency: string | null) => number;
  exDividendWindowDays?: number;
  secFilingWindowDays?: number;
}): PortfolioSmartEvent[] {
  const asOfMs = parseIsoDayMs(asOfDate);
  if (asOfMs === null) return [];

  const owned = holdings.filter(
    (h) =>
      Number.isFinite(h.quantity) &&
      h.quantity > 0 &&
      (h.asset.type === "stock" || h.asset.type === "etf"),
  );
  const ownedBySymbol = new Map(owned.map((h) => [h.asset.symbol.toUpperCase(), h]));
  const out: PortfolioSmartEvent[] = [];

  for (const info of dividendEvents) {
    const holding = ownedBySymbol.get(info.symbol.toUpperCase());
    if (!holding || !info.exDate) continue;
    const exMs = parseIsoDayMs(info.exDate);
    if (exMs === null) continue;
    const daysUntil = Math.round((exMs - asOfMs) / 86_400_000);
    if (daysUntil < 0 || daysUntil > exDividendWindowDays) continue;

    const rawPerShare = latestConfirmedAmountPerShare(info.paid);
    const converted = rawPerShare !== null ? toUsd(rawPerShare, info.currency) : Number.NaN;
    const perShareUsd = Number.isFinite(converted) && converted > 0 ? converted : null;
    const totalUsd = perShareUsd !== null ? perShareUsd * holding.quantity : null;

    out.push({
      kind: "ex_dividend_7d",
      symbol: holding.asset.symbol,
      name: holding.asset.name,
      exDate: info.exDate,
      payDate: parseIsoDayMs(info.payDate) !== null ? info.payDate : null,
      daysUntil,
      quantity: holding.quantity,
      perShareUsd,
      totalUsd,
    });
  }

  for (const filing of secFilings) {
    const holding = ownedBySymbol.get(filing.symbol.toUpperCase());
    if (!holding || holding.asset.type !== "stock") continue;
    const filedMs = parseIsoDayMs(filing.filed);
    const periodMs = parseIsoDayMs(filing.periodEnd);
    if (
      filedMs === null ||
      periodMs === null ||
      !/^https:\/\/www\.sec\.gov\//.test(filing.filingUrl)
    )
      continue;
    const daysSinceFiled = Math.round((asOfMs - filedMs) / 86_400_000);
    if (daysSinceFiled < 0 || daysSinceFiled > secFilingWindowDays) continue;

    out.push({
      kind: "sec_10k_filed",
      symbol: holding.asset.symbol,
      name: holding.asset.name,
      periodEnd: filing.periodEnd,
      filed: filing.filed,
      daysSinceFiled,
      filingUrl: filing.filingUrl,
    });
  }

  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "ex_dividend_7d" ? -1 : 1;
    if (a.kind === "ex_dividend_7d" && b.kind === "ex_dividend_7d") {
      return a.daysUntil - b.daysUntil || a.symbol.localeCompare(b.symbol);
    }
    if (a.kind === "sec_10k_filed" && b.kind === "sec_10k_filed") {
      return a.daysSinceFiled - b.daysSinceFiled || a.symbol.localeCompare(b.symbol);
    }
    return 0;
  });
}
