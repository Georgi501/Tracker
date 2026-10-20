/** Watchlist + price alerts: local preferences (tickers and target prices only, no portfolio data). */
export const WATCH_KEY = "folio-watchlist";
export const ALERTS_KEY = "folio-price-alerts";
export const SYMBOL_RE = /^[A-Z0-9.^=_-]{1,20}$/;

export interface PriceAlert { symbol: string; direction: "above" | "below"; target: number }

export function parseWatchlist(raw: string | null): string[] {
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && SYMBOL_RE.test(x)))].slice(0, 30) : [];
  } catch { return []; }
}

export function parseAlerts(raw: string | null): PriceAlert[] {
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(v)) return [];
    return v.filter((a): a is PriceAlert => !!a && typeof a === "object" && typeof a.symbol === "string" && SYMBOL_RE.test(a.symbol)
      && (a.direction === "above" || a.direction === "below") && typeof a.target === "number" && Number.isFinite(a.target) && a.target > 0).slice(0, 50);
  } catch { return []; }
}

/** True only with a real price; a missing quote never triggers an alert. */
export function alertTriggered(alert: PriceAlert, price: number | null | undefined): boolean {
  if (price == null || !Number.isFinite(price) || price <= 0) return false;
  return alert.direction === "above" ? price >= alert.target : price <= alert.target;
}

export const readWatchlist = () => parseWatchlist(localStorage.getItem(WATCH_KEY));
export const readAlerts = () => parseAlerts(localStorage.getItem(ALERTS_KEY));
export function writeWatchlist(list: string[]) { localStorage.setItem(WATCH_KEY, JSON.stringify(list)); window.dispatchEvent(new Event("folio-watch")); }
export function writeAlerts(list: PriceAlert[]) { localStorage.setItem(ALERTS_KEY, JSON.stringify(list)); window.dispatchEvent(new Event("folio-watch")); }
