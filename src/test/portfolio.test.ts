import { describe, expect, it } from "vitest";
import {
  computeHoldings,
  FX,
  isQuoteStale,
  projectedBondCoupon,
  type Asset,
} from "@/lib/portfolio";

const a: Asset = {
  id: "x",
  name: "X",
  symbol: "X",
  type: "stock",
  sector: "",
  region: "",
  price: 20,
  change24h: 0,
  dividendPerShare: 0,
  payMonths: [],
};

describe("portfolio math", () => {
  it("averages cost across buys and keeps avg cost on sell", () => {
    const h = computeHoldings(
      [a],
      [
        { id: "1", assetId: "x", kind: "buy", quantity: 10, price: 10, date: "2024-01-01" },
        { id: "2", assetId: "x", kind: "buy", quantity: 10, price: 14, date: "2024-02-01" },
        { id: "3", assetId: "x", kind: "sell", quantity: 5, price: 30, date: "2024-03-01" },
      ],
    )[0]!;
    expect(h.quantity).toBe(15);
    expect(h.avgCost).toBeCloseTo(12);
    expect(h.value).toBe(300);
    expect(h.pnl).toBeCloseTo(120);
  });
  it("adds buy fees to cost basis while selling does not change remaining acquisition cost", () => {
    const h = computeHoldings(
      [a],
      [
        {
          id: "buy",
          assetId: "x",
          kind: "buy",
          quantity: 2,
          price: 10,
          fee: 4,
          date: "2024-01-01",
        },
        {
          id: "sell",
          assetId: "x",
          kind: "sell",
          quantity: 1,
          price: 15,
          fee: 2,
          date: "2024-02-01",
        },
      ],
    )[0]!;
    expect(h.quantity).toBe(1);
    expect(h.costBasis).toBe(12);
    expect(h.avgCost).toBe(12);
  });
  it("supports only EUR and USD (no BGN)", () => {
    expect(Object.keys(FX).sort()).toEqual(["EUR", "USD"]);
  });
  it("marks quotes stale only after the weekend-safe freshness window", () => {
    const now = Date.parse("2026-10-31T12:00:00Z");
    expect(isQuoteStale("2026-10-27T12:00:00Z", now)).toBe(false);
    expect(isQuoteStale("2026-10-27T11:59:59Z", now)).toBe(true);
    expect(isQuoteStale(undefined, now)).toBe(false);
  });
  it("does not project annual bond coupons after maturity", () => {
    const bond = { bondCouponRate: 4, bondFaceValue: 1000, bondMaturityDate: "2025-01-01" };
    expect(projectedBondCoupon(bond, 2, new Date(2025, 0, 2))).toBeUndefined();
    expect(projectedBondCoupon(bond, 2, new Date(2025, 0, 1))).toBe(80);
  });
});

it("missing market prices are not replaced by the purchase price", () => {
  const result = computeHoldings(
    [{ ...a, price: Number.NaN, change24h: Number.NaN }],
    [{ id: "t", assetId: "x", kind: "buy", quantity: 2, price: 10, date: "2026-01-01" }],
  );
  expect(result[0]?.costBasis).toBe(20);
  expect(Number.isNaN(result[0]?.value)).toBe(true);
});

import { brokerLimit } from "@/lib/csv-import";
describe("plan limits", () => {
  it("free allows 1 broker", () => expect(brokerLimit(false)).toBe(1));
  it("pro allows 5 brokers", () => expect(brokerLimit(true)).toBe(5));
});
