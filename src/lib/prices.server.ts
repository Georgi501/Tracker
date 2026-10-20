import YahooFinance from "yahoo-finance2";

export interface LiveQuote { price: number; change: number | null; at: string; currency: string; source: "Yahoo Finance" | "CoinGecko" }
export const CRYPTO_IDS: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana", ADA: "cardano", XRP: "ripple", DOT: "polkadot", DOGE: "dogecoin", LTC: "litecoin", BNB: "binancecoin", AVAX: "avalanche-2", LINK: "chainlink", POL: "polygon-ecosystem-token" };
export function yahooClient() {
  return new YahooFinance({ suppressNotices: ["yahooSurvey"], fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) });
}
export async function fetchLiveQuote(symbol: string, type: string): Promise<LiveQuote | null> {
  try {
    if (type === "crypto") {
      const id = CRYPTO_IDS[symbol.toUpperCase()];
      if (!id) return null;
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) return null;
      const json = await r.json() as Record<string, { usd?: number; usd_24h_change?: number | null; last_updated_at?: number }>;
      const q = json[id];
      if (!q || !q.usd || !q.last_updated_at) return null;
      return { price: q.usd, change: q.usd_24h_change ?? null, at: new Date(q.last_updated_at * 1000).toISOString(), currency: "USD", source: "CoinGecko" };
    }
    // Intraday chart metadata provides an actual quote and previous close without quote's cookie/crumb flow.
    const chart = await yahooClient().chart(symbol, { period1: new Date(Date.now() - 86400000), interval: "5m" });
    const q = chart.meta;
    const previous = q.previousClose ?? q.chartPreviousClose;
    if (!(q.regularMarketPrice > 0) || !q.regularMarketTime || !q.currency) return null;
    return { price: q.regularMarketPrice, change: previous && previous > 0 ? (q.regularMarketPrice / previous - 1) * 100 : null,
      at: q.regularMarketTime.toISOString(), currency: q.currency, source: "Yahoo Finance" };
  } catch { return null; }
}
export async function fetchFx(): Promise<number | null> {
  const quote = await fetchLiveQuote("EURUSD=X", "stock");
  return quote && quote.price > 0 ? 1 / quote.price : null;
}
