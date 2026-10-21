import type { Asset, Transaction } from "./portfolio";

export type IssueKind = "duplicate" | "oversell" | "missingPrice" | "future" | "noQuote" | "orphan";
export interface Issue { kind: IssueKind; symbol: string; date?: string; count?: number }

/** Pure data-quality checks over real stored transactions; never alters data. */
export function qualityIssues(assets: Asset[], txs: Transaction[], today = new Date().toISOString().slice(0, 10)): Issue[] {
  const out: Issue[] = [];
  const byId = new Map(assets.map((a) => [a.id, a]));
  const sym = (id: string) => byId.get(id)?.symbol ?? "?";
  const seen = new Map<string, number>();
  for (const t of txs) {
    const k = `${t.assetId}|${t.kind}|${t.date}|${t.quantity}|${t.price}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
    if (!byId.has(t.assetId)) out.push({ kind: "orphan", symbol: "?", date: t.date });
    if (t.kind !== "dividend" && !Number.isFinite(t.price)) out.push({ kind: "missingPrice", symbol: sym(t.assetId), date: t.date });
    if (t.date > today) out.push({ kind: "future", symbol: sym(t.assetId), date: t.date });
  }
  for (const [k, n] of seen) if (n > 1) { const [id = "", , date = ""] = k.split("|"); out.push({ kind: "duplicate", symbol: sym(id), date, count: n }); }
  const qty = new Map<string, number>();
  for (const t of [...txs].sort((a, b) => a.date.localeCompare(b.date))) {
    if (t.kind === "dividend") continue;
    const q = (qty.get(t.assetId) ?? 0) + (t.kind === "buy" ? t.quantity : -t.quantity);
    qty.set(t.assetId, q);
    if (q < -1e-9) out.push({ kind: "oversell", symbol: sym(t.assetId), date: t.date });
  }
  for (const a of assets) if (a.type !== "cash" && (qty.get(a.id) ?? 0) > 0 && !Number.isFinite(a.price)) out.push({ kind: "noQuote", symbol: a.symbol });
  return out;
}
