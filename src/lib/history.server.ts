import { yahooClient } from "./prices.server";
import type { DailyPrice } from "./history";
const histCache = new Map<
  string,
  { at: number; v: Promise<{ currency: string; prices: DailyPrice[]; splits: boolean }> }
>();
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
  const result = await yahooClient().chart(
    type === "crypto" ? `${symbol.toUpperCase()}-USD` : symbol,
    {
      period1: start,
      period2: new Date(Date.parse(end) + 86400000),
      interval: "1d",
      events: "splits",
    },
  );
  const prices: DailyPrice[] = result.quotes.flatMap((q) =>
    q.close && q.close > 0 ? [{ date: q.date.toISOString().slice(0, 10), close: q.close }] : [],
  );
  if (!prices.length) throw new Error("History unavailable");
  return { currency: result.meta.currency, prices, splits: !!result.events?.splits?.length };
}
