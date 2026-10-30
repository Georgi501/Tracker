export type AssetType = "stock" | "etf" | "crypto" | "cash" | "realEstate";
export type TxKind = "buy" | "sell" | "dividend";
export type Currency = "USD" | "EUR";

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  sector: string;
  region: string;
  price: number; // USD; NaN means unavailable
  change24h: number; // percent
  dividendPerShare: number; // annual USD
  payMonths: number[]; // 0-11
  quoteCurrency?: string;
  quoteNativePrice?: number; // price in quoteCurrency, as quoted by the provider
  quoteAt?: string;
}

export interface Transaction {
  id: string;
  assetId: string;
  kind: TxKind;
  quantity: number;
  price: number; // USD; NaN means unavailable per unit (for dividend: total amount in USD, quantity=1)
  date: string; // ISO date
}

export interface Holding {
  asset: Asset;
  quantity: number;
  avgCost: number;
  costBasis: number;
  value: number;
  pnl: number;
  pnlPct: number;
  dayChange: number;
}

export const FX: Record<Currency, number> = { USD: 1, EUR: Number.NaN };

/** Trading currency of an asset (used for currency breakdown). */
export function assetCurrency(a: Asset): string {
  if (a.quoteCurrency) return a.quoteCurrency;
  if (a.type === "crypto") return "USD";
  if (a.type === "cash") return "EUR";
  return a.region === "Europe" ? "EUR" : "USD";
}

/** Per-period returns (%) of a value series, e.g. month by month. */
export function periodReturns(series: { t: number; v: number }[], buckets: number) {
  if (series.length < 2) return [];
  const step = Math.max(1, Math.floor((series.length - 1) / buckets));
  const out: { t: number; r: number }[] = [];
  for (let i = step; i < series.length; i += step) {
    out.push({ t: series[i]!.t, r: (series[i]!.v / series[i - step]!.v - 1) * 100 });
  }
  return out;
}

export function computeHoldings(assets: Asset[], txs: Transaction[]): Holding[] {
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map<string, { qty: number; cost: number }>();
  for (const t of sorted) {
    if (t.kind === "dividend") continue;
    const h = map.get(t.assetId) ?? { qty: 0, cost: 0 };
    if (t.kind === "buy") {
      h.qty += t.quantity;
      h.cost += t.quantity * t.price;
    } else {
      const sellQty = Math.min(t.quantity, h.qty);
      const avg = h.qty > 0 ? h.cost / h.qty : 0;
      h.qty -= sellQty;
      h.cost -= avg * sellQty;
    }
    map.set(t.assetId, h);
  }
  const out: Holding[] = [];
  for (const a of assets) {
    const h = map.get(a.id);
    if (!h || h.qty <= 1e-9) continue;
    const value = h.qty * a.price;
    const pnl = value - h.cost;
    out.push({
      asset: a,
      quantity: h.qty,
      avgCost: h.cost / h.qty,
      costBasis: h.cost,
      value,
      pnl,
      pnlPct: h.cost > 0 ? (pnl / h.cost) * 100 : 0,
      dayChange: value - value / (1 + a.change24h / 100),
    });
  }
  return out.sort((a, b) => b.value - a.value);
}

export function totalDividends(txs: Transaction[]) {
  return txs.filter((t) => t.kind === "dividend").reduce((s, t) => s + t.quantity * t.price, 0);
}

/** Money-weighted return (annualised IRR) via bisection. Flows: negative = invested. */
export function irr(flows: { date: Date; amount: number }[]): number {
  if (flows.length < 2) return 0;
  const t0 = flows[0]!.date.getTime();
  const npv = (r: number) =>
    flows.reduce(
      (s, f) => s + f.amount / Math.pow(1 + r, (f.date.getTime() - t0) / 31557600000),
      0,
    );
  let lo = -0.99,
    hi = 10;
  if (npv(lo) * npv(hi) > 0) return 0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

export function portfolioIrr(txs: Transaction[], currentValue: number, now = new Date()) {
  const flows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => ({
      date: new Date(t.date),
      amount: t.kind === "buy" ? -t.quantity * t.price : t.quantity * t.price,
    }));
  flows.push({ date: now, amount: currentValue });
  return irr(flows);
}

export type Period = "1D" | "1W" | "1M" | "1Y" | "ALL";

/** Time-weighted return over a series (chain-linked period returns). */
export function ttwror(series: { v: number }[]) {
  let g = 1;
  for (let i = 1; i < series.length; i++) g *= series[i]!.v / series[i - 1]!.v;
  return (g - 1) * 100;
}

export interface DividendEvent {
  assetId: string;
  symbol: string;
  name: string;
  date: Date;
  amount: number;
  paid: boolean;
}

export function groupBy(holdings: Holding[], key: (h: Holding) => string) {
  const m = new Map<string, number>();
  for (const h of holdings) m.set(key(h), (m.get(key(h)) ?? 0) + h.value);
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
