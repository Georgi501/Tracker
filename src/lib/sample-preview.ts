import { irr } from "./portfolio";
import {
  SAMPLE_COST_BASIS,
  SAMPLE_DIVIDENDS,
  SAMPLE_HOLDINGS,
  SAMPLE_TOTAL_VALUE,
} from "./sample-portfolio";

export const SAMPLE_PERIODS = ["1D", "1W", "1M", "1Y", "ALL"] as const;
export type SamplePeriod = (typeof SAMPLE_PERIODS)[number];
export const SAMPLE_AS_OF = "2026-10-31T16:00:00Z";
export const SAMPLE_INCEPTION = "2025-05-31T16:00:00Z";
export type SamplePoint = { t: number; value: number };
const point = (date: string, value: number): SamplePoint => ({ t: Date.parse(date), value });
// Explicit fictional fixtures, never used by real portfolios or market-data APIs.
const monthly = [
  ["2025-05-31", SAMPLE_COST_BASIS],
  ["2025-06-30", 13890],
  ["2025-07-31", 14070],
  ["2025-08-31", 13940],
  ["2025-09-30", 14150],
  ["2025-10-31", 14200],
  ["2025-11-30", 14380],
  ["2025-12-31", 14450],
  ["2026-01-31", 14300],
  ["2026-02-28", 14570],
  ["2026-03-31", 14420],
  ["2026-04-30", 14600],
  ["2026-05-31", 14650],
  ["2026-06-30", 15180],
  ["2026-07-31", 14920],
  ["2026-08-31", 15940],
  ["2026-09-30", 16230],
  ["2026-10-31", SAMPLE_TOTAL_VALUE],
] as const;
const histories: Record<SamplePeriod, readonly SamplePoint[]> = {
  "1D": [16840, 16865, 16851, 16910, 16890, 16940, 16920, 16965, SAMPLE_TOTAL_VALUE].map(
    (value, index) => point(`2026-10-31T${String(8 + index).padStart(2, "0")}:00:00Z`, value),
  ),
  "1W": [16410, 16480, 16560, 16495, 16650, 16810, SAMPLE_TOTAL_VALUE].map((value, index) =>
    point(`2026-10-${25 + index}T16:00:00Z`, value),
  ),
  "1M": [16260, 16340, 16295, 16485, 16610, 16775, SAMPLE_TOTAL_VALUE].map((value, index) =>
    point(`2026-10-${String(1 + index * 5).padStart(2, "0")}T16:00:00Z`, value),
  ),
  "1Y": monthly
    .filter(([date]) => date >= "2025-10-31")
    .map(([date, value]) => point(`${date}T16:00:00Z`, value)),
  ALL: monthly.map(([date, value]) => point(`${date}T16:00:00Z`, value)),
};
export function samplePeriodData(period: SamplePeriod) {
  const points = histories[period];
  const first = points[0]!;
  const last = points.at(-1)!;
  return {
    points,
    change: last.value - first.value,
    returnPercent: (last.value / first.value - 1) * 100,
  };
}
export const sampleAllocation = ["ETF", "Stock", "Crypto", "Bonds"].map((cls) => {
  const holdings = SAMPLE_HOLDINGS.filter((asset) => asset.cls === cls);
  const value = holdings.reduce((sum, asset) => sum + asset.qty * asset.value, 0);
  return { cls, value, share: value / SAMPLE_TOTAL_VALUE };
});
export const sampleDividendTotal = SAMPLE_DIVIDENDS.reduce((sum, item) => sum + item.amount, 0);
export const sampleDividendYield = (sampleDividendTotal / SAMPLE_TOTAL_VALUE) * 100;
export const sampleMwrr = irr([
  { date: new Date(SAMPLE_INCEPTION), amount: -SAMPLE_COST_BASIS },
  ...SAMPLE_DIVIDENDS.map((item) => ({
    date: new Date(`${item.date}T16:00:00Z`),
    amount: item.amount,
  })),
  { date: new Date(SAMPLE_AS_OF), amount: SAMPLE_TOTAL_VALUE },
]);
