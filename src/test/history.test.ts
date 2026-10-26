import { expect, it } from "vitest";
import { buildPortfolioHistory, currencyRate, periodStart, historyReturn } from "@/lib/history";
const eur = [
  { date: "2024-01-01", close: 1.1 },
  { date: "2024-01-02", close: 1.2 },
];
const gbp = [{ date: "2024-01-01", close: 1.25 }];
it("converts EUR to USD with the transaction date's rate", () => {
  expect(currencyRate("EUR", "2024-01-01", eur, gbp)).toBe(1.1);
  expect(currencyRate("EUR", "2024-01-02", eur, gbp)).toBe(1.2);
});
it("converts historical BGN through official EUR parity", () => {
  expect(currencyRate("BGN", "2024-01-01", eur, gbp)).toBeCloseTo(1.1 / 1.95583);
});
it("converts GBX as one hundredth GBP", () => {
  expect(currencyRate("GBX", "2024-01-01", eur, gbp)).toBe(0.0125);
});
it("does not fabricate a missing dated exchange rate", () => {
  expect(currencyRate("EUR", "2023-01-01", eur, gbp)).toBeNull();
});
it.each([
  ["1M", "2026-09-19"],
  ["3M", "2026-07-19"],
  ["6M", "2026-04-19"],
  ["1Y", "2025-10-19"],
  ["3Y", "2023-10-19"],
  ["5Y", "2021-10-19"],
  ["ALL", "2024-01-01"],
] as const)("supports %s history", (period, start) => {
  expect(periodStart(period, "2024-01-01", new Date("2026-10-19T12:00:00Z"))).toBe(start);
});
it("values daily quantities rather than today's quantities", () => {
  const result = buildPortfolioHistory(
    [
      {
        id: "a",
        type: "stock",
        currency: "EUR",
        prices: [
          { date: "2024-01-01", close: 10 },
          { date: "2024-01-02", close: 12 },
        ],
      },
    ],
    [{ id: "t", assetId: "a", kind: "buy", quantity: 2, price: 11, date: "2024-01-02" }],
    "2024-01-01",
    "2024-01-02",
    "EUR",
    eur,
    gbp,
  );
  expect(result.points.map((p) => p.v)).toEqual([0, 24]);
});
it("adjusts returns for added capital", () => {
  expect(
    historyReturn([
      { t: 1, v: 100, flow: 0 },
      { t: 2, v: 220, flow: 100 },
    ]),
  ).toBeCloseTo(20);
});
