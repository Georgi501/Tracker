import { closeAt, currencyRate, type DailyPrice, type PortfolioPoint } from "./history";
import type { Currency } from "./portfolio";
export const BENCHMARKS = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "NASDAQ Composite" },
  { symbol: "^STOXX50E", name: "EURO STOXX 50" },
  { symbol: "^FTSE", name: "FTSE 100" },
] as const;
export type BenchmarkSymbol = typeof BENCHMARKS[number]["symbol"];
export function savedBenchmark(value: unknown): BenchmarkSymbol | "none" {
  return BENCHMARKS.find((b) => b.symbol === value)?.symbol ?? "none";
}
export function benchmarkSeries(points: PortfolioPoint[], prices: DailyPrice[], indexCurrency: string, base: Currency, eur: DailyPrice[], gbp: DailyPrice[]) {
  const start = points[0];
  if (!start || start.v <= 0) return [];
  const values = points.map((p) => {
    const date = new Date(p.t).toISOString().slice(0, 10);
    const close = closeAt(prices, date);
    const rate = currencyRate(indexCurrency, date, eur, gbp);
    const baseRate = currencyRate(base, date, eur, gbp);
    return close === null || rate === null || baseRate === null ? null : close * rate / baseRate;
  });
  const first = values[0];
  if (!first || values.some((v) => v === null)) return [];
  let growth = 1;
  const out: { t: number; portfolio: number; benchmark: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i]; const prior = points[i - 1]; const index = values[i];
    if (!p || index === null || index === undefined) return [];
    if (prior) {
      if (prior.v <= 0 || p.v - p.flow < 0) return [];
      growth *= (p.v - p.flow) / prior.v;
    }
    out.push({ t: p.t, portfolio: (growth - 1) * 100, benchmark: (index / first - 1) * 100 });
  }
  return out;
}