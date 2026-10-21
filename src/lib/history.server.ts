import { yahooClient, CRYPTO_IDS } from "./prices.server";
import type { DailyPrice } from "./history";
/** CoinGecko's free API only serves the last 365 days, so longer crypto series come from Yahoo's USD pair — one provider per chart, never a stitched mix. */
const COINGECKO_MAX_DAYS = 365;
const histCache = new Map<string, { at: number; v: Promise<{ currency: string; prices: DailyPrice[]; splits: boolean }> }>();
/** Daily closes change at most once a day; cache 6h (failures are evicted so they retry). */
export function dailyHistory(symbol: string, start: string, end: string, type = "stock") {
  const k = `${type}:${symbol}:${start}:${end}`;
  const hit = histCache.get(k);
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.v;
  const v = dailyHistoryRaw(symbol, start, end, type);
  histCache.set(k, { at: Date.now(), v });
  v.catch(() => histCache.delete(k));
  if (histCache.size > 1000) histCache.delete(histCache.keys().next().value!);
  return v;
}
async function dailyHistoryRaw(symbol: string, start: string, end: string, type = "stock") {
  if (type === "crypto" && Date.parse(end) - Date.parse(start) <= COINGECKO_MAX_DAYS * 86400000) {
    const id = CRYPTO_IDS[symbol];
    if (!id) throw new Error("Unsupported cryptocurrency");
    const from = Math.floor(Date.parse(start) / 1000); const to = Math.floor((Date.parse(end) + 86400000) / 1000);
    const r = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error("Crypto history unavailable");
    const data = await r.json() as { prices: [number, number][] };
    const days = new Map<string, number>();
    for (const [t, v] of data.prices) days.set(new Date(t).toISOString().slice(0, 10), v);
    return { currency: "USD", prices: [...days].map(([date, close]) => ({ date, close })), splits: false };
  }
  const result = await yahooClient().chart(type === "crypto" ? `${symbol.toUpperCase()}-USD` : symbol, { period1: start, period2: new Date(Date.parse(end) + 86400000), interval: "1d", events: "splits" });
  const prices: DailyPrice[] = result.quotes.flatMap((q) => q.close && q.close > 0 ? [{ date: q.date.toISOString().slice(0, 10), close: q.close }] : []);
  if (!prices.length) throw new Error("History unavailable");
  return { currency: result.meta.currency, prices, splits: !!result.events?.splits?.length };
}
