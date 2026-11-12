import { describe, expect, it } from "vitest";
import {
  SAMPLE_PERIODS,
  samplePeriodData,
  sampleAllocation,
  sampleDividendTotal,
  sampleDividendYield,
  sampleMwrr,
  SAMPLE_INCEPTION,
  SAMPLE_AS_OF,
} from "@/lib/sample-preview";
import { SAMPLE_COST_BASIS, SAMPLE_TOTAL_VALUE, SAMPLE_DIVIDENDS } from "@/lib/sample-portfolio";
describe("illustrative sample portfolio integrity", () => {
  it.each(SAMPLE_PERIODS)(
    "has a distinct, ordered and complete %s series ending at the displayed balance",
    (period) => {
      const result = samplePeriodData(period);
      expect(result.points.length).toBeGreaterThan(2);
      expect(result.points.at(-1)).toEqual({
        t: Date.parse(SAMPLE_AS_OF),
        value: SAMPLE_TOTAL_VALUE,
      });
      expect(
        result.points.every(
          (point, index) =>
            Number.isFinite(point.value) &&
            point.value > 0 &&
            (index === 0 || point.t > result.points[index - 1]!.t),
        ),
      ).toBe(true);
    },
  );
  it("changes the data and returns for every timeframe instead of relabelling one line", () => {
    const results = SAMPLE_PERIODS.map(samplePeriodData);
    expect(new Set(results.map((result) => JSON.stringify(result.points))).size).toBe(5);
    expect(new Set(results.map((result) => result.change)).size).toBe(5);
    expect(results.at(-1)!.points[0]!.value).toBe(SAMPLE_COST_BASIS);
  });
  it("reconciles allocation and trailing illustrative dividends to the displayed holdings", () => {
    expect(sampleAllocation.reduce((sum, item) => sum + item.value, 0)).toBe(SAMPLE_TOTAL_VALUE);
    expect(sampleAllocation.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(1, 12);
    expect(sampleDividendTotal).toBeCloseTo(28.99, 8);
    expect(sampleDividendYield).toBeCloseTo((28.99 / SAMPLE_TOTAL_VALUE) * 100, 10);
  });
  it("calculates dated money-weighted return from cash flows, not gain divided by cost", () => {
    expect(sampleMwrr).not.toBeNull();
    const flows = [
      { t: Date.parse(SAMPLE_INCEPTION), amount: -SAMPLE_COST_BASIS },
      ...SAMPLE_DIVIDENDS.map((item) => ({
        t: Date.parse(`${item.date}T16:00:00Z`),
        amount: item.amount,
      })),
      { t: Date.parse(SAMPLE_AS_OF), amount: SAMPLE_TOTAL_VALUE },
    ];
    const start = flows[0]!.t;
    const npv = flows.reduce(
      (sum, flow) =>
        sum + flow.amount / (1 + sampleMwrr! / 100) ** ((flow.t - start) / 31557600000),
      0,
    );
    expect(npv).toBeCloseTo(0, 6);
  });
});
