import { yahooClient } from "./prices.server";
import { parseStockSplits } from "./corporate-actions";
import { publicEdgeCache, type PublicEdgeCache } from "./edge-cache.server";
import type { DailyPrice } from "./history";

export interface DailyHistoryResult {
  currency: string;
  prices: DailyPrice[];
  splits: { date: string; numerator: number; denominator: number }[];
}

const MARKET_HISTORY_EDGE_TTL_SECONDS = 15 * 60;

export function createDailyHistoryService({
  fetcher = dailyHistoryRaw,
  now = Date.now,
  edgeCache = publicEdgeCache,
}: {
  fetcher?: (
    symbol: string,
    start: string,
    end: string,
    type: string,
  ) => Promise<DailyHistoryResult>;
  now?: () => number;
  edgeCache?: PublicEdgeCache;
} = {}) {
  const histCache = new Map<
    string,
    {
      at: number;
      v: Promise<DailyHistoryResult>;
    }
  >();

  /** Daily closes change at most once a day; L1 RAM cache 6h + L2 Edge Cache 15m (failures are evicted so they retry). */
  return function dailyHistory(symbol: string, start: string, end: string, type = "stock") {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const k = `${type}:${normalizedSymbol}:${start}:${end}`;
    const hit = histCache.get(k);
    if (hit && now() - hit.at < 6 * 3600_000) return hit.v;
    const v = (async () => {
      const edgeHit = await edgeCache.get<DailyHistoryResult>("market-daily-history", k);
      if (
        edgeHit &&
        typeof edgeHit.currency === "string" &&
        Array.isArray(edgeHit.prices) &&
        edgeHit.prices.length > 0 &&
        Array.isArray(edgeHit.splits)
      ) {
        return edgeHit;
      }
      const fresh = await fetcher(symbol, start, end, type);
      if (fresh.prices.length > 0) {
        await edgeCache.set("market-daily-history", k, fresh, MARKET_HISTORY_EDGE_TTL_SECONDS);
      }
      return fresh;
    })();
    histCache.set(k, { at: now(), v });
    v.catch(() => histCache.delete(k));
    if (histCache.size > 1000) histCache.delete(histCache.keys().next().value!);
    return v;
  };
}

export const dailyHistory = createDailyHistoryService();

async function dailyHistoryRaw(
  symbol: string,
  start: string,
  end: string,
  type = "stock",
): Promise<DailyHistoryResult> {
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
  return {
    currency: result.meta.currency,
    prices,
    splits: parseStockSplits(result.events?.splits),
  };
}
