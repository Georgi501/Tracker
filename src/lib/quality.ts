import { isQuoteStale, type Asset, type Transaction } from "./portfolio";

export type IssueKind =
  | "duplicate"
  | "oversell"
  | "missingPrice"
  | "future"
  | "noQuote"
  | "staleQuote"
  | "targetReviewDue"
  | "orphan";
export interface Issue {
  kind: IssueKind;
  symbol: string;
  date?: string;
  count?: number;
}

/** Pure data-quality checks over real stored transactions; never alters data. */
export function qualityIssues(
  assets: Asset[],
  txs: Transaction[],
  today = new Date().toISOString().slice(0, 10),
  targetReviews: Record<string, string> = {},
  now = Date.now(),
): Issue[] {
  const out: Issue[] = [];
  const byId = new Map(assets.map((a) => [a.id, a]));
  const sym = (id: string) => byId.get(id)?.symbol ?? "?";
  const seen = new Map<string, number>();
  for (const t of txs) {
    const k = `${t.assetId}|${t.kind}|${t.date}|${t.quantity}|${t.price}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
    if (!byId.has(t.assetId)) out.push({ kind: "orphan", symbol: "?", date: t.date });
    if (t.kind !== "dividend" && !Number.isFinite(t.price))
      out.push({ kind: "missingPrice", symbol: sym(t.assetId), date: t.date });
    if (t.date > today) out.push({ kind: "future", symbol: sym(t.assetId), date: t.date });
  }
  for (const [k, n] of seen)
    if (n > 1) {
      const [id = "", , date = ""] = k.split("|");
      out.push({ kind: "duplicate", symbol: sym(id), date, count: n });
    }
  const qty = new Map<string, number>();
  for (const t of [...txs].sort((a, b) => a.date.localeCompare(b.date))) {
    if (t.kind === "dividend") continue;
    const q = (qty.get(t.assetId) ?? 0) + (t.kind === "buy" ? t.quantity : -t.quantity);
    qty.set(t.assetId, q);
    if (q < -1e-9) out.push({ kind: "oversell", symbol: sym(t.assetId), date: t.date });
  }
  for (const a of assets)
    if (a.type !== "cash" && (qty.get(a.id) ?? 0) > 0) {
      if (!Number.isFinite(a.price)) out.push({ kind: "noQuote", symbol: a.symbol });
      else if (isQuoteStale(a.quoteAt, now)) out.push({ kind: "staleQuote", symbol: a.symbol });
    }
  for (const [symbol, reviewedAt] of Object.entries(targetReviews)) {
    const reviewedTime = Date.parse(`${reviewedAt}T00:00:00Z`);
    const todayTime = Date.parse(`${today}T00:00:00Z`);
    if (
      Number.isFinite(reviewedTime) &&
      Number.isFinite(todayTime) &&
      todayTime - reviewedTime > 90 * 86400000
    )
      out.push({ kind: "targetReviewDue", symbol, date: reviewedAt });
  }
  return out;
}

export function increasesOversellAmount(before: Transaction[], after: Transaction[]): boolean {
  const totalShortfall = (transactions: Transaction[]) => {
    const quantities = new Map<string, number>();
    let shortfall = 0;
    for (const transaction of [...transactions].sort((a, b) => a.date.localeCompare(b.date))) {
      if (transaction.kind === "dividend") continue;
      const current = quantities.get(transaction.assetId) ?? 0;
      if (transaction.kind === "sell") {
        shortfall += Math.max(0, transaction.quantity - Math.max(0, current));
        quantities.set(transaction.assetId, current - transaction.quantity);
      } else {
        quantities.set(transaction.assetId, current + transaction.quantity);
      }
    }
    return shortfall;
  };
  return totalShortfall(after) > totalShortfall(before) + 1e-9;
}
