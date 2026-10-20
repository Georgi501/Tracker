import { assetCurrency, type Holding } from "./portfolio";

export interface ConcentrationItem { kind: "position" | "sector" | "currency"; name: string; weight: number; limit: number }
export const CONCENTRATION_LIMITS = { position: 20, sector: 40, currency: 70 } as const;

/** Largest weights (%) by position, sector and currency, flagged when above the limit. Uses only priced holdings. */
export function concentration(holdings: Holding[]) {
  const priced = holdings.filter((h) => Number.isFinite(h.value) && h.value > 0);
  const total = priced.reduce((s, h) => s + h.value, 0);
  const top = (key: (h: Holding) => string, kind: ConcentrationItem["kind"]) => {
    const m = new Map<string, number>();
    for (const h of priced) m.set(key(h), (m.get(key(h)) ?? 0) + h.value);
    return [...m.entries()].map(([name, v]) => ({ kind, name, weight: (v / total) * 100, limit: CONCENTRATION_LIMITS[kind] }))
      .sort((a, b) => b.weight - a.weight);
  };
  if (total <= 0) return { top: [] as ConcentrationItem[], warnings: [] as ConcentrationItem[] };
  const groups = [top((h) => h.asset.symbol, "position"), top((h) => h.asset.sector || "Other", "sector"), top((h) => assetCurrency(h.asset), "currency")];
  return { top: groups.map((g) => g[0]!).filter(Boolean), warnings: groups.flat().filter((i) => i.weight > i.limit) };
}

export interface DividendRow { symbol: string; income: number; yieldPct: number; yocPct: number }
/** Trailing-12M confirmed income (USD) per position, with yield on current value and yield on cost. */
export function dividendRows(rows: { symbol: string; quantity: number; value: number; costBasis: number; paidUsdPerShare: number }[]): DividendRow[] {
  return rows.filter((r) => Number.isFinite(r.paidUsdPerShare) && r.paidUsdPerShare > 0).map((r) => {
    const income = r.paidUsdPerShare * r.quantity;
    return { symbol: r.symbol, income, yieldPct: r.value > 0 ? (income / r.value) * 100 : Number.NaN, yocPct: r.costBasis > 0 ? (income / r.costBasis) * 100 : Number.NaN };
  }).sort((a, b) => b.income - a.income);
}

/** Future value at target date with monthly contributions and an assumed annual return. */
export function goalProjection(o: { current: number; monthly: number; annualReturnPct: number; months: number }) {
  const r = Math.pow(1 + o.annualReturnPct / 100, 1 / 12) - 1;
  let v = Math.max(0, o.current);
  for (let m = 0; m < Math.max(0, Math.round(o.months)); m++) v = v * (1 + r) + o.monthly;
  return v;
}

/** Monthly contribution needed to reach target by the date (0 if already on track). */
export function requiredMonthly(o: { current: number; target: number; annualReturnPct: number; months: number }) {
  const n = Math.max(1, Math.round(o.months));
  const r = Math.pow(1 + o.annualReturnPct / 100, 1 / 12) - 1;
  const grown = Math.max(0, o.current) * Math.pow(1 + r, n);
  const gap = o.target - grown;
  if (gap <= 0) return 0;
  return r === 0 ? gap / n : gap * r / (Math.pow(1 + r, n) - 1);
}
