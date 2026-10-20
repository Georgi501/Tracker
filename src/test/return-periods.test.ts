import { describe, expect, it } from "vitest";
import { comparisonReturns, customRange, DAY, periodRange, previousRange, rangeReturn, RETURN_BUCKETS, RETURN_PERIODS } from "@/lib/return-periods";

describe("custom return periods", () => {
  it("includes both chosen days and compares an equally long adjacent period", () => {
    const range = customRange("2026-10-10", "2026-10-19", "2026-10-19");
    expect(range).toEqual({ start: Date.UTC(2026, 9, 10), end: Date.UTC(2026, 9, 20) });
    if (!range) throw new Error("Expected valid range");
    expect(previousRange(range)).toEqual({ start: Date.UTC(2026, 8, 30), end: Date.UTC(2026, 9, 10) });
  });
  it("accepts a single-day period", () => {
    const range = customRange("2026-10-19", "2026-10-19", "2026-10-19");
    expect(range && range.end - range.start).toBe(DAY);
  });
  it("rejects reversed, missing and future dates", () => {
    expect(customRange("2026-10-19", "2026-10-10", "2026-10-19")).toBeNull();
    expect(customRange("", "2026-10-19", "2026-10-19")).toBeNull();
    expect(customRange("2026-10-19", "2026-10-20", "2026-10-19")).toBeNull();
  });
  it("calculates independent returns for aligned intervals", () => {
    const series = [{ t: 0, v: 100 }, { t: DAY, v: 110 }, { t: 2 * DAY, v: 132 }];
    const range = { start: DAY, end: 2 * DAY };
    const rows = comparisonReturns(series, range, 1);
    expect(rows[0]?.current).toBeCloseTo(20);
    expect(rows[0]?.previous).toBeCloseTo(10);
    expect(rangeReturn(series, range)).toBeCloseTo(20);
  });
  it("returns unavailable rather than zero for missing or empty history", () => {
    expect(rangeReturn([], { start: 0, end: DAY })).toBeNull();
    expect(rangeReturn([{ t: DAY, v: 100 }, { t: 2 * DAY, v: 120 }], { start: 0, end: DAY })).toBeNull();
    expect(rangeReturn([{ t: 0, v: 0 }, { t: DAY, v: 0 }], { start: 0, end: DAY })).toBeNull();
  });
  it("counts 3 and 6 months and 3 and 5 years back on the calendar", () => {
    const anchor = Date.UTC(2026, 9, 20);
    expect(periodRange("3M", anchor)).toEqual({ start: Date.UTC(2026, 6, 20), end: anchor });
    expect(periodRange("6M", anchor)).toEqual({ start: Date.UTC(2026, 3, 20), end: anchor });
    expect(periodRange("3Y", anchor)).toEqual({ start: Date.UTC(2023, 9, 20), end: anchor });
    expect(periodRange("5Y", anchor)).toEqual({ start: Date.UTC(2021, 9, 20), end: anchor });
  });
  it("uses the earliest real point for ALL and a year back when there is none", () => {
    const anchor = Date.UTC(2026, 9, 20);
    expect(periodRange("ALL", anchor, Date.UTC(2019, 0, 5))).toEqual({ start: Date.UTC(2019, 0, 5), end: anchor });
    expect(periodRange("ALL", anchor).start).toBe(Date.UTC(2025, 9, 20));
  });
  it("offers every new period with a readable bar count", () => {
    expect(RETURN_PERIODS).toEqual(["1W", "1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"]);
    expect(RETURN_BUCKETS["3M"]).toBe(9);
    expect(RETURN_BUCKETS["5Y"]).toBe(10);
  });
});