import type { Holding, Transaction } from "./portfolio";

export interface AssetSummary {
  bought: number;
  sold: number;
  dividends: number;
  buys: number;
  sells: number;
  firstDate: string | null;
}

/** Per-asset totals from real transactions (USD). */
export function assetSummary(txs: Transaction[], assetId: string): AssetSummary {
  const own = txs.filter((t) => t.assetId === assetId);
  const s: AssetSummary = { bought: 0, sold: 0, dividends: 0, buys: 0, sells: 0, firstDate: null };
  for (const t of own) {
    if (t.kind === "buy") {
      s.bought += t.quantity * t.price;
      s.buys++;
    } else if (t.kind === "sell") {
      s.sold += t.quantity * t.price;
      s.sells++;
    } else s.dividends += t.price * t.quantity;
    if (!s.firstDate || t.date < s.firstDate) s.firstDate = t.date;
  }
  return s;
}

/** Transactions grouped by month (YYYY-MM), newest first. */
export function timelineByMonth(txs: Transaction[]): { month: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  for (const t of [...txs].sort((a, b) => b.date.localeCompare(a.date))) {
    const m = t.date.slice(0, 7);
    (map.get(m) ?? map.set(m, []).get(m)!).push(t);
  }
  return [...map].map(([month, items]) => ({ month, items }));
}

/** Shareable snapshot: only percentage weights by asset class, no amounts. */
export function snapshotWeights(holdings: Holding[]): { cls: string; pct: number }[] {
  const priced = holdings.filter((h) => Number.isFinite(h.value) && h.value > 0);
  const total = priced.reduce((s, h) => s + h.value, 0);
  if (!total) return [];
  const by = new Map<string, number>();
  for (const h of priced) by.set(h.asset.type, (by.get(h.asset.type) ?? 0) + h.value);
  return [...by]
    .map(([cls, v]) => ({ cls, pct: Math.round((v / total) * 1000) / 10 }))
    .sort((a, b) => b.pct - a.pct);
}

/** True when a journal review date is today or past. */
export function reviewDue(
  reviewDate: string | null,
  today = new Date().toISOString().slice(0, 10),
) {
  return !!reviewDate && reviewDate <= today;
}
