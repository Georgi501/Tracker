import { expect, it } from "vitest";
import { benchmarkSeries, savedBenchmark, twrIrrDeltaSummary } from "@/lib/benchmark";
const dates = [Date.parse("2026-10-01"), Date.parse("2026-10-02")];
const prices = [
  { date: "2026-10-01", close: 100 },
  { date: "2026-10-02", close: 110 },
];
const points = [
  { t: dates[0] ?? 0, v: 100, flow: 0 },
  { t: dates[1] ?? 0, v: 220, flow: 100 },
];
it("restores a valid saved benchmark including FTSE All-World (VT / VWCE.DE) and rejects unknown values", () => {
  expect(savedBenchmark("^GSPC")).toBe("^GSPC");
  expect(savedBenchmark("^NDX")).toBe("^NDX");
  expect(savedBenchmark("VT")).toBe("VT");
  expect(savedBenchmark("VWCE.DE")).toBe("VWCE.DE");
  expect(savedBenchmark("URTH")).toBe("URTH");
  expect(savedBenchmark("^N225")).toBe("^N225");
  expect(savedBenchmark("^STOXX50E")).toBe("none");
  expect(savedBenchmark("^FTSE")).toBe("none");
  expect(savedBenchmark("^IXIC")).toBe("none");
  expect(savedBenchmark("invalid")).toBe("none");
  expect(savedBenchmark(null)).toBe("none");
});
it("starts both returns at zero and removes portfolio contributions", () => {
  const rows = benchmarkSeries(points, prices, "USD", "USD", [], []);
  expect(rows[0]).toMatchObject({ portfolio: 0, benchmark: 0 });
  expect(rows[1]?.portfolio).toBeCloseTo(20);
  expect(rows[1]?.benchmark).toBeCloseTo(10);
});
it("converts index returns to EUR with dated FX", () => {
  const eur = [
    { date: "2026-10-01", close: 1 },
    { date: "2026-10-02", close: 1.1 },
  ];
  expect(benchmarkSeries(points, prices, "USD", "EUR", eur, [])[1]?.benchmark).toBeCloseTo(0);
});
it("aligns EUR-denominated FTSE All-World UCITS (VWCE.DE) into USD base currency using dated FX", () => {
  const eur = [
    { date: "2026-10-01", close: 1.0 },
    { date: "2026-10-02", close: 1.1 },
  ];
  const rows = benchmarkSeries(points, prices, "EUR", "USD", eur, []);
  expect(rows[1]?.benchmark).toBeCloseTo(21);
});
it("computes TTWROR vs. IRR cash-flow timing delta and handles missing inputs safely", () => {
  expect(twrIrrDeltaSummary(12, 15.5)).toEqual({
    ttwror: 12,
    irr: 15.5,
    spreadPp: 3.5,
    timingEffect: "favorable",
  });
  expect(twrIrrDeltaSummary(14, 9.2)).toEqual({
    ttwror: 14,
    irr: 9.2,
    spreadPp: -4.8,
    timingEffect: "unfavorable",
  });
  expect(twrIrrDeltaSummary(10, 10.1)).toEqual({
    ttwror: 10,
    irr: 10.1,
    spreadPp: 0.1,
    timingEffect: "neutral",
  });
  expect(twrIrrDeltaSummary(10, null)).toBeNull();
  expect(twrIrrDeltaSummary(Number.NaN, 10)).toBeNull();
});
it("does not manufacture missing index history", () => {
  expect(benchmarkSeries(points, [], "USD", "USD", [], [])).toEqual([]);
});
it("requires a positive opening portfolio valuation", () => {
  expect(
    benchmarkSeries([{ t: dates[0] ?? 0, v: 0, flow: 0 }], prices, "USD", "USD", [], []),
  ).toEqual([]);
});
