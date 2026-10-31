import type { Asset, Holding, Transaction } from "./portfolio";
import type { PortfolioPoint } from "./history";

export interface RealizedLot {
  assetId: string;
  date: string;
  quantity: number;
  proceeds: number;
  cost: number;
  gain: number;
}
export interface TaxYear {
  year: number;
  realized: number;
  proceeds: number;
  cost: number;
  dividends: number;
  sales: RealizedLot[];
}

/** FIFO realized gains per sale, plus dividends received, grouped by calendar year (USD). */
export function fifoTaxReport(txs: Transaction[]): TaxYear[] {
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  const lots = new Map<string, { qty: number; costPerUnit: number }[]>();
  const years = new Map<number, TaxYear>();
  const yearOf = (d: string) => {
    const y = Number(d.slice(0, 4));
    let r = years.get(y);
    if (!r) {
      r = { year: y, realized: 0, proceeds: 0, cost: 0, dividends: 0, sales: [] };
      years.set(y, r);
    }
    return r;
  };
  for (const t of sorted) {
    if (t.kind === "dividend") {
      yearOf(t.date).dividends += t.quantity * t.price - (t.fee ?? 0);
      continue;
    }
    const queue = lots.get(t.assetId) ?? [];
    lots.set(t.assetId, queue);
    if (t.kind === "buy") {
      queue.push({ qty: t.quantity, costPerUnit: t.price + (t.fee ?? 0) / t.quantity });
      continue;
    }
    let left = t.quantity;
    let cost = 0;
    let matched = 0;
    while (left > 1e-12 && queue.length) {
      const lot = queue[0]!;
      const take = Math.min(lot.qty, left);
      cost += take * lot.costPerUnit;
      matched += take;
      lot.qty -= take;
      left -= take;
      if (lot.qty <= 1e-12) queue.shift();
    }
    if (matched <= 0) continue;
    const proceeds = matched * t.price - (t.fee ?? 0) * (matched / t.quantity);
    const y = yearOf(t.date);
    y.sales.push({
      assetId: t.assetId,
      date: t.date,
      quantity: matched,
      proceeds,
      cost,
      gain: proceeds - cost,
    });
    y.realized += proceeds - cost;
    y.proceeds += proceeds;
    y.cost += cost;
  }
  return [...years.values()].sort((a, b) => b.year - a.year);
}

/** Buy-only rebalancing: split new cash so classes move toward targets (%) without selling. */
export function rebalance(
  current: Record<string, number>,
  targets: Record<string, number>,
  cash: number,
): Record<string, number> {
  const keys = Object.keys(targets).filter((k) => targets[k]! > 0);
  const out: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  const sumT = keys.reduce((s, k) => s + targets[k]!, 0);
  if (!(cash > 0) || sumT <= 0) return out;
  const total = keys.reduce((s, k) => s + (current[k] ?? 0), 0) + cash;
  const gaps = keys.map((k) => ({
    k,
    gap: Math.max(0, (targets[k]! / sumT) * total - (current[k] ?? 0)),
  }));
  const sumGap = gaps.reduce((s, g) => s + g.gap, 0);
  for (const g of gaps)
    out[g.k] = sumGap > 0 ? (g.gap / sumGap) * cash : (targets[g.k]! / sumT) * cash;
  return out;
}

export interface RiskMetrics {
  volatility: number;
  maxDrawdown: number;
  sharpe: number;
  sortino: number;
}
/** Annualized volatility, max drawdown (flow-adjusted index) and Sharpe from daily points; null if too short. */
export function riskMetrics(points: PortfolioPoint[], riskFreePct = 0): RiskMetrics | null {
  const rets: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (a.v <= 0) continue;
    rets.push((b.v - b.flow) / a.v - 1);
  }
  if (rets.length < 10) return null;
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1));
  let idx = 1;
  let peak = 1;
  let mdd = 0;
  for (const r of rets) {
    idx *= 1 + r;
    peak = Math.max(peak, idx);
    mdd = Math.min(mdd, idx / peak - 1);
  }
  const vol = sd * Math.sqrt(365);
  const annual = mean * 365;
  const down =
    Math.sqrt(rets.reduce((s, r) => s + Math.min(0, r) ** 2, 0) / rets.length) * Math.sqrt(365);
  return {
    volatility: vol * 100,
    maxDrawdown: mdd * 100,
    sharpe: vol > 0 ? (annual - riskFreePct / 100) / vol : 0,
    sortino: down > 0 ? (annual - riskFreePct / 100) / down : 0,
  };
}

export function exportCsv(assets: Asset[], txs: Transaction[]): string {
  const by = new Map(assets.map((a) => [a.id, a]));
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => {
      const a = by.get(t.assetId);
      return [
        t.date,
        t.kind,
        a?.symbol ?? "",
        a?.name ?? "",
        a?.type ?? "",
        t.quantity,
        t.price,
        t.fee ?? 0,
      ]
        .map((v) => esc(String(v)))
        .join(",");
    });
  return [
    "date,type,symbol,name,asset_type,quantity,price,fee,currency",
    ...rows.map((row) => `${row},USD`),
  ].join("\n");
}

export function classValues(holdings: Holding[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of holdings)
    if (Number.isFinite(h.value)) out[h.asset.type] = (out[h.asset.type] ?? 0) + h.value;
  return out;
}

/** Spreadsheet-ready tax report: yearly summary rows followed by each FIFO sale (USD). */
export function taxReportCsv(years: TaxYear[], assets: Asset[]): string {
  const by = new Map(assets.map((a) => [a.id, a.symbol]));
  const r = (n: number) => n.toFixed(2);
  const lines = ["section,year,date,symbol,quantity,proceeds_usd,cost_usd,gain_usd,dividends_usd"];
  for (const y of years)
    lines.push(
      ["summary", y.year, "", "", "", r(y.proceeds), r(y.cost), r(y.realized), r(y.dividends)].join(
        ",",
      ),
    );
  for (const y of years)
    for (const s of y.sales)
      lines.push(
        [
          "sale",
          y.year,
          s.date,
          by.get(s.assetId) ?? "",
          s.quantity,
          r(s.proceeds),
          r(s.cost),
          r(s.gain),
          "",
        ].join(","),
      );
  return lines.join("\n");
}
