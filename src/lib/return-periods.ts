export interface DateRange {
  start: number;
  end: number;
}
export interface ValuePoint {
  t: number;
  v: number;
}
export const DAY = 86400000;

export function dateInput(t: number) {
  return new Date(t).toISOString().slice(0, 10);
}

/** Date ranges are inclusive calendar days; the comparison is adjacent, not overlapping. */
export function customRange(start: string, end: string, today: string): DateRange | null {
  const first = Date.parse(`${start}T00:00:00Z`);
  const last = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(first) || !Number.isFinite(last) || first > last || end > today) return null;
  return { start: first, end: last + DAY };
}

export function previousRange(range: DateRange): DateRange {
  return { start: range.start - (range.end - range.start), end: range.start };
}

export function valueAt(series: ValuePoint[], t: number): number | null {
  const first = series[0];
  const last = series.at(-1);
  if (!first || !last || t < first.t || t > last.t) return null;
  if (t === first.t) return first.v;
  for (let i = 1; i < series.length; i++) {
    const right = series[i];
    const left = series[i - 1];
    if (right && left && t <= right.t) {
      return left.v + (right.v - left.v) * ((t - left.t) / (right.t - left.t));
    }
  }
  return last.v;
}

export function rangeReturn(series: ValuePoint[], range: DateRange): number | null {
  const start = valueAt(series, range.start);
  const end = valueAt(series, range.end);
  return start === null || end === null || start <= 0 ? null : (end / start - 1) * 100;
}

export function comparisonReturns(series: ValuePoint[], range: DateRange, buckets: number) {
  const previous = previousRange(range);
  const step = (range.end - range.start) / buckets;
  return Array.from({ length: buckets }, (_, i) => {
    const start = range.start + i * step;
    const previousStart = previous.start + i * step;
    return {
      t: start,
      previousT: previousStart,
      current: rangeReturn(series, { start, end: start + step }),
      previous: rangeReturn(series, { start: previousStart, end: previousStart + step }),
    };
  });
}

export type ReturnPeriod = "1W" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
export const RETURN_PERIODS: ReturnPeriod[] = ["1W", "1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"];
const PERIOD_MONTHS: Partial<Record<ReturnPeriod, number>> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  "3Y": 36,
  "5Y": 60,
};
/** Bar counts keep every bar readable: about a day up to half a year. */
export const RETURN_BUCKETS: Record<ReturnPeriod, number> = {
  "1W": 7,
  "1M": 10,
  "3M": 9,
  "6M": 12,
  "1Y": 12,
  "3Y": 12,
  "5Y": 10,
  ALL: 12,
};
/** Calendar-accurate lookback; ALL uses the earliest real point, or a year back when there is none. */
export function periodRange(period: ReturnPeriod, anchor: number, firstPoint?: number): DateRange {
  if (period === "ALL") return { start: firstPoint ?? anchor - 365 * DAY, end: anchor };
  if (period === "1W") return { start: anchor - 7 * DAY, end: anchor };
  const from = new Date(anchor);
  from.setUTCMonth(from.getUTCMonth() - (PERIOD_MONTHS[period] ?? 12));
  return { start: from.getTime(), end: anchor };
}
