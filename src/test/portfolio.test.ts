import { describe, expect, it } from "vitest";
import { computeHoldings, FX, type Asset } from "@/lib/portfolio";

const a: Asset = { id: "x", name: "X", symbol: "X", type: "stock", sector: "", region: "", price: 20, change24h: 0, dividendPerShare: 0, payMonths: [] };

describe("portfolio math", () => {
  it("averages cost across buys and keeps avg cost on sell", () => {
    const h = computeHoldings([a], [
      { id: "1", assetId: "x", kind: "buy", quantity: 10, price: 10, date: "2024-01-01" },
      { id: "2", assetId: "x", kind: "buy", quantity: 10, price: 14, date: "2024-02-01" },
      { id: "3", assetId: "x", kind: "sell", quantity: 5, price: 30, date: "2024-03-01" },
    ])[0]!;
    expect(h.quantity).toBe(15);
    expect(h.avgCost).toBeCloseTo(12);
    expect(h.value).toBe(300);
    expect(h.pnl).toBeCloseTo(120);
  });
  it("supports only EUR and USD (no BGN)", () => {
    expect(Object.keys(FX).sort()).toEqual(["EUR", "USD"]);
  });
});

it("missing market prices are not replaced by the purchase price", () => {
  const result = computeHoldings([{ ...a, price: Number.NaN, change24h: Number.NaN }], [{ id: "t", assetId: "x", kind: "buy", quantity: 2, price: 10, date: "2026-01-01" }]);
  expect(result[0]?.costBasis).toBe(20);
  expect(Number.isNaN(result[0]?.value)).toBe(true);
});

import { brokerLimit } from "@/lib/csv-import";
describe("plan limits", () => {
  it("free allows 1 broker", () => expect(brokerLimit(false)).toBe(1));
  it("pro allows 5 brokers", () => expect(brokerLimit(true)).toBe(5));
});
