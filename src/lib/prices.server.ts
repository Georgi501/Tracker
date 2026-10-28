import YahooFinance from "yahoo-finance2";
import { CRYPTO_SYMBOLS } from "./crypto-assets";

export interface LiveQuote {
  price: number;
  change: number | null;
  at: string;
  currency: string;
  source: "Yahoo Finance";
}
export function yahooClient() {
  return new YahooFinance({
    suppressNotices: ["yahooSurvey"],
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
  });
}
const cache = new Map<string, { at: number; v: LiveQuote }>();
const supportedCryptoSymbols = new Set<string>(CRYPTO_SYMBOLS);
const QUOTE_TTL = 60_000;
/** Short in-memory cache (1 min) so repeated views don't hammer Yahoo Finance; only successful real quotes are cached. */
export async function fetchLiveQuote(symbol: string, type: string): Promise<LiveQuote | null> {
  if (type === "crypto") {
    const quotes = await fetchCryptoQuotes([symbol]);
    return quotes[symbol.toUpperCase()] ?? null;
  }
  const k = `${type}:${symbol.toUpperCase()}`;
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < QUOTE_TTL) return hit.v;
  const v = await fetchLiveQuoteRaw(symbol, type);
  if (v) {
    cache.set(k, { at: Date.now(), v });
    if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  }
  return v;
}

export async function fetchCryptoQuotes(symbols: string[]): Promise<Record<string, LiveQuote>> {
  const result: Record<string, LiveQuote> = {};
  const missing: string[] = [];
  for (const symbol of new Set(symbols.map((item) => item.toUpperCase()))) {
    if (!supportedCryptoSymbols.has(symbol)) continue;
    const cached = cache.get(`crypto:${symbol}`);
    if (cached && Date.now() - cached.at < QUOTE_TTL) {
      result[symbol] = cached.v;
    } else {
      missing.push(symbol);
    }
  }
  if (!missing.length) return result;

  for (let i = 0; i < missing.length; i += 4) {
    const quotes = await Promise.all(
      missing.slice(i, i + 4).map(async (symbol) => {
        const quote = await fetchLiveQuoteRaw(`${symbol}-USD`, "crypto");
        if (
          !quote ||
          quote.currency !== "USD" ||
          !Number.isFinite(Date.parse(quote.at)) ||
          Date.now() - new Date(quote.at).getTime() > 15 * 60_000
        )
          return [symbol, null] as const;
        return [symbol, quote] as const;
      }),
    );
    for (const [symbol, quote] of quotes) {
      if (!quote) continue;
      cache.set(`crypto:${symbol}`, { at: Date.now(), v: quote });
      result[symbol] = quote;
    }
  }
  if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  return result;
}

function sessionDay(date: Date, timeZone: string | undefined): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Close of the last completed session before the quote's trading day, independent of the requested window. */
export function previousSessionClose(
  bars: { date: Date; close: number | null }[],
  quoteAt: Date,
  timeZone?: string,
): number | null {
  const today = sessionDay(quoteAt, timeZone);
  for (let i = bars.length - 1; i >= 0; i--) {
    const bar = bars[i]!;
    if (bar.close != null && bar.close > 0 && sessionDay(bar.date, timeZone) < today)
      return bar.close;
  }
  return null;
}

async function fetchLiveQuoteRaw(symbol: string, type: string): Promise<LiveQuote | null> {
  try {
    // Chart metadata provides an actual quote without quote's cookie/crumb flow; daily bars give a stable previous close.
    const chart = await yahooClient().chart(symbol, {
      period1: new Date(Date.now() - 10 * 86400000),
      interval: "1d",
    });
    const q = chart.meta;
    const previous =
      q.regularMarketTime &&
      (previousSessionClose(chart.quotes, q.regularMarketTime, q.exchangeTimezoneName) ??
        q.previousClose ??
        q.chartPreviousClose);
    if (!(q.regularMarketPrice > 0) || !q.regularMarketTime || !q.currency) return null;
    return {
      price: q.regularMarketPrice,
      change: previous && previous > 0 ? (q.regularMarketPrice / previous - 1) * 100 : null,
      at: q.regularMarketTime.toISOString(),
      currency: q.currency,
      source: "Yahoo Finance",
    };
  } catch {
    return null;
  }
}
let fxCache: { at: number; v: number } | null = null;
export async function fetchFx(): Promise<number | null> {
  if (fxCache && Date.now() - fxCache.at < 5 * 60_000) return fxCache.v;
  const v = await fetchFxRaw();
  if (v) fxCache = { at: Date.now(), v };
  return v;
}
async function fetchFxRaw(): Promise<number | null> {
  const quote = await fetchLiveQuote("EURUSD=X", "stock");
  return quote && quote.price > 0 ? 1 / quote.price : null;
}
