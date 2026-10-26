import type { Currency, Transaction } from "./portfolio";
export interface DailyPrice {
  date: string;
  close: number;
}
export interface HistoryAsset {
  id: string;
  type: string;
  currency: string;
  prices: DailyPrice[];
}
export interface PortfolioPoint {
  t: number;
  v: number;
  flow: number;
}
export type HistoryPeriod = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
const HISTORY_MONTHS: Partial<Record<HistoryPeriod, number>> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  "3Y": 36,
  "5Y": 60,
};
export function periodStart(period: HistoryPeriod, first: string, now: Date): string {
  if (period === "ALL") return first;
  const date = new Date(now);
  date.setUTCMonth(date.getUTCMonth() - (HISTORY_MONTHS[period] ?? 12));
  return date.toISOString().slice(0, 10);
}
export function closeAt(prices: DailyPrice[], date: string): number | null {
  let result: DailyPrice | undefined;
  for (const p of prices) {
    if (p.date > date) break;
    result = p;
  }
  if (!result || Date.parse(date) - Date.parse(result.date) > 7 * 86400000) return null;
  return result.close > 0 ? result.close : null;
}
export function currencyRate(
  currency: string,
  date: string,
  eurUsd: DailyPrice[],
  gbpUsd: DailyPrice[],
): number | null {
  if (currency === "USD") return 1;
  if (currency === "EUR" || currency === "BGN") {
    const rate = closeAt(eurUsd, date);
    // Historical Bulgarian lev's official fixed EUR parity; not a market estimate.
    return rate === null ? null : rate / (currency === "BGN" ? 1.95583 : 1);
  }
  if (["GBP", "GBX", "GBp"].includes(currency)) {
    const rate = closeAt(gbpUsd, date);
    return rate === null ? null : rate / (currency === "GBP" ? 1 : 100);
  }
  return null;
}
export function buildPortfolioHistory(
  assets: HistoryAsset[],
  txs: Transaction[],
  start: string,
  end: string,
  base: Currency,
  eurUsd: DailyPrice[],
  gbpUsd: DailyPrice[],
) {
  const points: PortfolioPoint[] = [];
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  const qty = new Map<string, number>();
  let index = 0;
  for (let t = Date.parse(start); t <= Date.parse(end); t += 86400000) {
    const date = new Date(t).toISOString().slice(0, 10);
    let flow = 0;
    while (index < sorted.length) {
      const tx = sorted[index];
      if (!tx || tx.date > date) break;
      if (tx.kind !== "dividend")
        qty.set(
          tx.assetId,
          Math.max(
            0,
            (qty.get(tx.assetId) ?? 0) + (tx.kind === "buy" ? tx.quantity : -tx.quantity),
          ),
        );
      if (tx.date === date) flow += tx.quantity * tx.price * (tx.kind === "buy" ? 1 : -1);
      index++;
    }
    let value = 0;
    let available = true;
    for (const asset of assets) {
      const units = qty.get(asset.id) ?? 0;
      if (!units) continue;
      const price = asset.type === "cash" ? 1 : closeAt(asset.prices, date);
      const rate = currencyRate(asset.currency, date, eurUsd, gbpUsd);
      if (price === null || rate === null) {
        available = false;
        break;
      }
      value += units * price * rate;
    }
    const baseRate = base === "USD" ? 1 : currencyRate("EUR", date, eurUsd, gbpUsd);
    if (!available || baseRate === null) return { points: [], unavailable: true };
    points.push({ t, v: value / baseRate, flow: flow / baseRate });
  }
  return { points, unavailable: false };
}
/** End-of-day external cash flow adjustment; never confuse contributions with investment returns. */
export function historyReturn(points: PortfolioPoint[]): number | null {
  if (points.length < 2) return null;
  let growth = 1;
  for (let i = 1; i < points.length; i++) {
    const prior = points[i - 1];
    const current = points[i];
    if (!prior || !current || prior.v <= 0 || current.v - current.flow < 0) return null;
    growth *= (current.v - current.flow) / prior.v;
  }
  return (growth - 1) * 100;
}
