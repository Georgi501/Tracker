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

export interface FifoSalePreview {
  quantity: number;
  proceeds: number;
  cost: number;
  gain: number;
}

export interface AssetReturnSeries {
  symbol: string;
  weight: number;
  prices: { date: string; value: number }[];
}

export interface DividendIncomeSummary {
  currentMonth: number;
  previousMonth: number;
  yearToDate: number;
  previousYearToDate: number;
  excludedTransactions: number;
  monthly: { month: string; amount: number }[];
  byAsset: { assetId: string; symbol: string; amount: number }[];
}

export function dividendIncomeSummary(
  transactions: Transaction[],
  assets: Pick<Asset, "id" | "symbol">[],
  asOfDate = new Date().toISOString().slice(0, 10),
): DividendIncomeSummary {
  const [yearText = "", monthText = "", dayText = ""] = asOfDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const validAsOf =
    /^\d{4}-\d{2}-\d{2}$/.test(asOfDate) &&
    Number.isInteger(year) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (!validAsOf) throw new Error("Invalid dividend summary date");

  const currentMonth = asOfDate.slice(0, 7);
  const previousMonthDate = new Date(Date.UTC(year, month - 2, 1));
  const previousMonth = previousMonthDate.toISOString().slice(0, 7);
  const previousYear = year - 1;
  const previousYearLastDay = new Date(Date.UTC(previousYear, month, 0)).getUTCDate();
  const previousYearCutoff = `${previousYearText(previousYear)}-${monthText}-${String(Math.min(day, previousYearLastDay)).padStart(2, "0")}`;
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 12 + index, 1));
    return { month: date.toISOString().slice(0, 7), amount: 0 };
  });
  const monthlyByKey = new Map(monthly.map((item) => [item.month, item]));
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const byAsset = new Map<string, number>();
  let currentMonthTotal = 0;
  let previousMonthTotal = 0;
  let yearToDate = 0;
  let previousYearToDate = 0;
  let excludedTransactions = 0;

  for (const transaction of transactions) {
    if (transaction.kind !== "dividend") continue;
    const amount = transaction.quantity * transaction.price - (transaction.fee ?? 0);
    const transactionDate = new Date(`${transaction.date}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date) ||
      !Number.isFinite(transactionDate.getTime()) ||
      transactionDate.toISOString().slice(0, 10) !== transaction.date ||
      !Number.isFinite(amount) ||
      transaction.date > asOfDate
    ) {
      excludedTransactions++;
      continue;
    }
    const transactionMonth = transaction.date.slice(0, 7);
    const monthPoint = monthlyByKey.get(transactionMonth);
    if (monthPoint) monthPoint.amount += amount;
    if (transactionMonth === currentMonth) currentMonthTotal += amount;
    if (transactionMonth === previousMonth) previousMonthTotal += amount;
    if (transaction.date >= `${yearText}-01-01` && transaction.date <= asOfDate) {
      yearToDate += amount;
      byAsset.set(transaction.assetId, (byAsset.get(transaction.assetId) ?? 0) + amount);
    }
    if (transaction.date >= `${previousYear}-01-01` && transaction.date <= previousYearCutoff)
      previousYearToDate += amount;
  }
  return {
    currentMonth: currentMonthTotal,
    previousMonth: previousMonthTotal,
    yearToDate,
    previousYearToDate,
    excludedTransactions,
    monthly,
    byAsset: [...byAsset]
      .map(([assetId, amount]) => ({
        assetId,
        symbol: assetsById.get(assetId)?.symbol ?? "?",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}

function previousYearText(year: number): string {
  return String(year).padStart(4, "0");
}

export function assetRiskAnalysis(series: AssetReturnSeries[]) {
  const eligible = series.filter((item) => item.weight > 0 && item.prices.length >= 2);
  if (eligible.length < 2) return null;
  const commonDates = eligible.reduce(
    (dates, item) => new Set([...dates].filter((date) => item.prices.some((p) => p.date === date))),
    new Set(eligible[0]!.prices.map((point) => point.date)),
  );
  const dates = [...commonDates].sort();
  if (dates.length < 31) return null;
  const returns = eligible.map((item) => {
    const byDate = new Map(item.prices.map((point) => [point.date, point.value]));
    return dates.slice(1).map((date, index) => {
      const current = byDate.get(date);
      const previous = byDate.get(dates[index]!);
      return current && previous ? current / previous - 1 : Number.NaN;
    });
  });
  if (returns.some((values) => values.some((value) => !Number.isFinite(value)))) return null;
  const means = returns.map(
    (values) => values.reduce((sum, value) => sum + value, 0) / values.length,
  );
  const cov = returns.map((left, i) =>
    returns.map((right, j) => {
      const total = left.reduce(
        (sum, value, index) => sum + (value - means[i]!) * (right[index]! - means[j]!),
        0,
      );
      return total / (left.length - 1);
    }),
  );
  if (cov.some((row, index) => !(row[index]! > 0))) return null;
  const totalWeight = eligible.reduce((sum, item) => sum + item.weight, 0);
  const weights = eligible.map((item) => item.weight / totalWeight);
  const variance = weights.reduce(
    (sum, weight, i) =>
      sum + weights.reduce((inner, other, j) => inner + weight * other * cov[i]![j]!, 0),
    0,
  );
  if (!(variance > 0)) return null;
  const volatility = Math.sqrt(variance * 252);
  const correlations = eligible.map((item, i) => ({
    symbol: item.symbol,
    values: eligible.map((other, j) => ({
      symbol: other.symbol,
      value: cov[i]![j]! / Math.sqrt(cov[i]![i]! * cov[j]![j]!),
    })),
  }));
  const contributions = eligible.map((item, i) => ({
    symbol: item.symbol,
    share:
      (weights[i]! * weights.reduce((sum, other, j) => sum + other * cov[i]![j]!, 0)) / variance,
  }));
  return { observations: dates.length - 1, volatility, correlations, contributions };
}

/** Estimates FIFO proceeds and gain for a hypothetical sale; it never changes transactions. */
export function fifoSalePreview(
  txs: Transaction[],
  assetId: string,
  quantity: number,
  price: number,
): FifoSalePreview | null {
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0)
    return null;

  const lots: { quantity: number; costPerUnit: number }[] = [];
  for (const transaction of [...txs]
    .filter((item) => item.assetId === assetId && item.kind !== "dividend")
    .sort((a, b) => a.date.localeCompare(b.date))) {
    if (
      !Number.isFinite(transaction.quantity) ||
      transaction.quantity <= 0 ||
      !Number.isFinite(transaction.price) ||
      transaction.price < 0 ||
      (transaction.fee !== undefined && (!Number.isFinite(transaction.fee) || transaction.fee < 0))
    )
      return null;
    if (transaction.kind === "buy") {
      lots.push({
        quantity: transaction.quantity,
        costPerUnit: transaction.price + (transaction.fee ?? 0) / transaction.quantity,
      });
      continue;
    }

    let remaining = transaction.quantity;
    while (remaining > 1e-12 && lots.length) {
      const lot = lots[0]!;
      const used = Math.min(remaining, lot.quantity);
      lot.quantity -= used;
      remaining -= used;
      if (lot.quantity <= 1e-12) lots.shift();
    }
  }

  const available = lots.reduce((sum, lot) => sum + lot.quantity, 0);
  if (quantity > available + 1e-9) return null;
  let remaining = quantity;
  let cost = 0;
  while (remaining > 1e-12 && lots.length) {
    const lot = lots[0]!;
    const used = Math.min(remaining, lot.quantity);
    cost += used * lot.costPerUnit;
    lot.quantity -= used;
    remaining -= used;
    if (lot.quantity <= 1e-12) lots.shift();
  }
  const proceeds = quantity * price;
  return { quantity, proceeds, cost, gain: proceeds - cost };
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
