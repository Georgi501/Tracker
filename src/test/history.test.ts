import { expect, it } from "vitest";
import {
  buildPortfolioHistory,
  currencyRate,
  historyReturn,
  isValidIsoDate,
  mapInBatches,
  periodStart,
} from "@/lib/history";
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
it("validates real calendar dates instead of only their string shape", () => {
  expect(isValidIsoDate("2024-02-29")).toBe(true);
  expect(isValidIsoDate("2025-02-29")).toBe(false);
  expect(isValidIsoDate("2024-13-01")).toBe(false);
  expect(isValidIsoDate("2024-04-31")).toBe(false);
});
it.each([
  ["1M", "2026-09-19"],
  ["3M", "2026-07-19"],
  ["6M", "2026-04-19"],
  ["YTD", "2026-01-01"],
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
it("attributes price changes to each asset after excluding dated trade flows", () => {
  const result = buildPortfolioHistory(
    [
      {
        id: "a",
        type: "stock",
        currency: "USD",
        prices: [
          { date: "2024-01-01", close: 10 },
          { date: "2024-01-02", close: 12 },
          { date: "2024-01-03", close: 11 },
        ],
      },
    ],
    [
      { id: "buy", assetId: "a", kind: "buy", quantity: 10, price: 10, date: "2024-01-01" },
      { id: "add", assetId: "a", kind: "buy", quantity: 5, price: 12, date: "2024-01-02" },
      { id: "sell", assetId: "a", kind: "sell", quantity: 5, price: 11, date: "2024-01-03" },
    ],
    "2024-01-01",
    "2024-01-03",
    "USD",
    [],
    [],
  );
  expect(result.assetContributions).toEqual([{ assetId: "a", amount: 5 }]);
  expect(result.assetContributions.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(
    result.points.at(-1)!.v -
      result.points[0]!.v -
      result.points.slice(1).reduce((sum, point) => sum + point.flow, 0),
  );
});
it("replays confirmed stock splits in the adjusted unit basis", () => {
  const result = buildPortfolioHistory(
    [
      {
        id: "a",
        type: "stock",
        currency: "USD",
        prices: Array.from({ length: 32 }, (_, day) => ({
          date: new Date(Date.UTC(2024, 0, day + 1)).toISOString().slice(0, 10),
          close: 50,
        })),
      },
    ],
    [{ id: "buy", assetId: "a", kind: "buy", quantity: 10, price: 100, date: "2024-01-01" }],
    "2024-01-01",
    "2024-02-01",
    "USD",
    [],
    [],
    [{ assetId: "a", date: "2024-02-01", numerator: 2, denominator: 1 }],
  );
  expect(result.points).toHaveLength(32);
  expect(result.points.every((point) => point.v === 1000)).toBe(true);
  expect(result.assetContributions).toEqual([{ assetId: "a", amount: 0 }]);
});
it("adjusts returns for added capital", () => {
  expect(
    historyReturn([
      { t: 1, v: 100, flow: 0 },
      { t: 2, v: 220, flow: 100 },
    ]),
  ).toBeCloseTo(20);
});
it("limits parallel history work to each batch and preserves result order", async () => {
  let active = 0;
  let peak = 0;
  const result = await mapInBatches(
    Array.from({ length: 8 }, (_, index) => index),
    3,
    async (item) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return item * 2;
    },
  );
  expect(peak).toBe(3);
  expect(result).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
});
it("rejects an invalid history batch size", async () => {
  await expect(mapInBatches([1], 0, async (value) => value)).rejects.toThrow(
    "Batch size must be a positive integer",
  );
});
