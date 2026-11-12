import {
  closeAt,
  currencyRate,
  type DailyPrice,
  type HistoryAsset,
  type PortfolioPoint,
} from "./history";
import {
  normalizeTransactionsForSplits,
  type CorporateAction,
  type Currency,
  type Transaction,
} from "./portfolio";
export type AttributionDay = {
  t: number;
  price: number;
  fx: number;
  dividends: number;
  fees: number;
  total: number;
  flow: number;
  opening: number;
  closing: number;
};
/** Daily-close arithmetic attribution. Price/FX interaction belongs to FX; same-day trading effect belongs to price. No tax or income estimates. */
export function dailyAttribution(
  assets: HistoryAsset[],
  transactions: Transaction[],
  points: PortfolioPoint[],
  base: Currency,
  eur: DailyPrice[],
  gbp: DailyPrice[],
  splits: CorporateAction[] = [],
): AttributionDay[] | null {
  if (points.length < 2) return null;
  const txs = normalizeTransactionsForSplits(transactions, splits).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  if (
    txs.some(
      (t) =>
        !Number.isFinite(t.price) ||
        !Number.isFinite(t.quantity) ||
        !Number.isFinite(t.fee ?? 0) ||
        t.price < 0 ||
        t.quantity < 0 ||
        (t.fee ?? 0) < 0,
    )
  )
    return null;
  const quantities = new Map<string, number>();
  let cursor = 0;
  const update = (tx: Transaction) => {
    if (tx.kind !== "dividend")
      quantities.set(
        tx.assetId,
        (quantities.get(tx.assetId) ?? 0) + (tx.kind === "buy" ? tx.quantity : -tx.quantity),
      );
  };
  const firstDate = new Date(points[0]!.t).toISOString().slice(0, 10);
  while (cursor < txs.length && txs[cursor]!.date <= firstDate) update(txs[cursor++]!);
  const result: AttributionDay[] = [];
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]!,
      current = points[i]!;
    if (current.t - previous.t !== 86400000 || ![previous.v, current.v].every(Number.isFinite))
      return null;
    const date = new Date(current.t).toISOString().slice(0, 10),
      priorDate = new Date(previous.t).toISOString().slice(0, 10);
    const baseNow = base === "USD" ? 1 : currencyRate("EUR", date, eur, gbp),
      basePrior = base === "USD" ? 1 : currencyRate("EUR", priorDate, eur, gbp);
    if (baseNow === null || basePrior === null) return null;
    const before = new Map(quantities);
    const dayTx: Transaction[] = [];
    let dividends = 0,
      fees = 0,
      flow = 0;
    while (cursor < txs.length && txs[cursor]!.date <= date) {
      const tx = txs[cursor++]!;
      if (tx.date !== date) return null;
      dayTx.push(tx);
      update(tx);
      fees -= (tx.fee ?? 0) / baseNow;
      if (tx.kind === "dividend") dividends += tx.price / baseNow;
      else flow += ((tx.kind === "buy" ? 1 : -1) * tx.quantity * tx.price) / baseNow;
    }
    let price = 0,
      fx = 0;
    for (const asset of assets) {
      const q = before.get(asset.id) ?? 0,
        after = quantities.get(asset.id) ?? 0;
      const trades = dayTx.filter((t) => t.assetId === asset.id && t.kind !== "dividend");
      if (q < -1e-8 || after < -1e-8) return null;
      if (!q && !trades.length) continue;
      const p1 =
        asset.type === "cash" ? 1 : closeAt(asset.prices, date, asset.manualValuation ? 90 : 7);
      const r1 = currencyRate(asset.currency, date, eur, gbp);
      if (p1 === null || r1 === null) return null;
      if (q) {
        const p0 =
            asset.type === "cash"
              ? 1
              : closeAt(asset.prices, priorDate, asset.manualValuation ? 90 : 7),
          r0 = currencyRate(asset.currency, priorDate, eur, gbp);
        if (p0 === null || r0 === null) return null;
        price += (q * (p1 - p0) * r0) / basePrior;
        fx += q * p1 * (r1 / baseNow - r0 / basePrior);
      }
      for (const tx of trades)
        price += ((tx.kind === "buy" ? 1 : -1) * tx.quantity * (p1 * r1 - tx.price)) / baseNow;
    }
    if (dayTx.some((t) => t.kind !== "dividend" && !assets.some((a) => a.id === t.assetId)))
      return null;
    const market = price + fx;
    if (
      Math.abs(current.v - previous.v - flow - market) > Math.max(0.01, Math.abs(current.v) * 1e-9)
    )
      return null;
    result.push({
      t: current.t,
      price,
      fx,
      dividends,
      fees,
      total: market + dividends + fees,
      flow,
      opening: previous.v,
      closing: current.v,
    });
  }
  return result;
}
export function attributionForRange(
  days: AttributionDay[] | null | undefined,
  start: number,
  end: number,
) {
  const selected = days?.filter((d) => d.t >= start && d.t < end);
  if (!selected?.length) return null;
  return selected.reduce(
    (sum, d) => ({
      price: sum.price + d.price,
      fx: sum.fx + d.fx,
      dividends: sum.dividends + d.dividends,
      fees: sum.fees + d.fees,
      total: sum.total + d.total,
      flow: sum.flow + d.flow,
      start: selected[0]!.t - 86400000,
      end: d.t,
    }),
    { price: 0, fx: 0, dividends: 0, fees: 0, total: 0, flow: 0, start: 0, end: 0 },
  );
}
