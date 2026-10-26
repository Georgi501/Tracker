import YahooFinance from "yahoo-finance2";
import { CRYPTO_IDS } from "./crypto-assets";

export interface LiveQuote {
  price: number;
  change: number | null;
  at: string;
  currency: string;
  source: "Yahoo Finance" | "CoinGecko";
}
export { CRYPTO_IDS } from "./crypto-assets";
export function yahooClient() {
  return new YahooFinance({
    suppressNotices: ["yahooSurvey"],
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
  });
}
const cache = new Map<string, { at: number; v: LiveQuote }>();
const QUOTE_TTL = 60_000;
/** Short in-memory cache (1 min) so repeated views don't hammer Yahoo/CoinGecko; only successful real quotes are cached. */
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
  const missing = new Map<string, string>();
  for (const symbol of new Set(symbols.map((item) => item.toUpperCase()))) {
    const id = CRYPTO_IDS[symbol];
    if (!id) continue;
    const cached = cache.get(`crypto:${symbol}`);
    if (cached && Date.now() - cached.at < QUOTE_TTL) {
      result[symbol] = cached.v;
    } else {
      missing.set(symbol, id);
    }
  }
  if (!missing.size) return result;

  try {
    const ids = [...missing.values()].join(",");
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) return result;
    const data = (await response.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number | null; last_updated_at?: number }
    >;
    const now = Date.now();
    for (const [symbol, id] of missing) {
      const quote = data[id];
      if (
        !quote ||
        !Number.isFinite(quote.usd) ||
        !quote.usd ||
        !quote.last_updated_at ||
        now - quote.last_updated_at * 1000 > 15 * 60_000
      )
        continue;
      const liveQuote: LiveQuote = {
        price: quote.usd,
        change: quote.usd_24h_change ?? null,
        at: new Date(quote.last_updated_at * 1000).toISOString(),
        currency: "USD",
        source: "CoinGecko",
      };
      cache.set(`crypto:${symbol}`, { at: now, v: liveQuote });
      result[symbol] = liveQuote;
    }
    if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  } catch {
    return result;
  }
  return result;
}

async function fetchLiveQuoteRaw(symbol: string, type: string): Promise<LiveQuote | null> {
  try {
    // Intraday chart metadata provides an actual quote and previous close without quote's cookie/crumb flow.
    const chart = await yahooClient().chart(symbol, {
      period1: new Date(Date.now() - 86400000),
      interval: "5m",
    });
    const q = chart.meta;
    const previous = q.previousClose ?? q.chartPreviousClose;
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
