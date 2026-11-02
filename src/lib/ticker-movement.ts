export type TickerRange = "1D" | "1W" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "MAX";

const MIN_SPARKLINE_SCALE: Record<TickerRange, number> = {
  "1D": 2,
  "1W": 5,
  "1M": 12,
  "3M": 25,
  "6M": 35,
  YTD: 40,
  "1Y": 50,
  "3Y": 100,
  MAX: 150,
};

export function rangeChange(closes: readonly number[], lastPrice: number | null): number | null {
  const valid = closes.filter((price) => Number.isFinite(price) && price > 0);
  if (valid.length < 2) return null;

  const first = valid[0]!;
  const last = valid.at(-1)!;
  const end = lastPrice != null && Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : last;
  return (end / first - 1) * 100;
}

export function sparklineReturns(
  closes: readonly number[],
  referencePrice: number | null,
  lastPrice: number | null,
): number[] {
  const valid = closes.filter((price) => Number.isFinite(price) && price > 0);
  if (valid.length < 2) return [];

  const base =
    referencePrice != null && Number.isFinite(referencePrice) && referencePrice > 0
      ? referencePrice
      : valid[0]!;
  const values = valid.map((price) => (price / base - 1) * 100);
  const end = lastPrice != null && Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : null;
  if (end != null && end !== valid.at(-1)) values.push((end / base - 1) * 100);
  return values;
}

export function sharedSparklineScale(
  series: readonly (readonly number[])[],
  range: TickerRange,
): number {
  const largestMove = series.reduce(
    (largest, values) =>
      values.reduce(
        (max, value) => (Number.isFinite(value) ? Math.max(max, Math.abs(value)) : max),
        largest,
      ),
    0,
  );
  return Math.max(MIN_SPARKLINE_SCALE[range], largestMove * 1.1);
}
