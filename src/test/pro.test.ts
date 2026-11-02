import { describe, expect, it } from "vitest";
import {
  fireProjection,
  isValidFireAssumptions,
  MAX_FIRE_CURRENCY_AMOUNT,
  monthlyIncome,
} from "@/lib/pro";

describe("FIRE projection", () => {
  it("uses the 4% rule for the target", () => {
    expect(
      fireProjection({ current: 0, monthly: 0, annualReturnPct: 0, annualSpend: 24000 }).target,
    ).toBe(600000);
  });
  it("reaches the target with contributions only", () => {
    const r = fireProjection({ current: 0, monthly: 1000, annualReturnPct: 0, annualSpend: 4800 });
    expect(r.years).toBe(10); // 120000 target / 1000 per month
  });
  it("returns null when unreachable", () => {
    expect(
      fireProjection({ current: 0, monthly: 0, annualReturnPct: 5, annualSpend: 1000 }).years,
    ).toBeNull();
  });
});

describe("FIRE calculator input validation", () => {
  const valid = { current: 0, monthly: 500, annualReturnPct: 6, annualSpend: 24000 };

  it("accepts non-negative amounts and the documented return boundaries", () => {
    expect(isValidFireAssumptions(valid)).toBe(true);
    expect(isValidFireAssumptions({ ...valid, annualReturnPct: -100 })).toBe(true);
    expect(isValidFireAssumptions({ ...valid, annualReturnPct: 100 })).toBe(true);
    expect(isValidFireAssumptions({ ...valid, current: MAX_FIRE_CURRENCY_AMOUNT })).toBe(true);
  });

  it("rejects negative or excessive amounts and out-of-range returns", () => {
    expect(isValidFireAssumptions({ ...valid, current: -1 })).toBe(false);
    expect(isValidFireAssumptions({ ...valid, monthly: MAX_FIRE_CURRENCY_AMOUNT + 1 })).toBe(false);
    expect(isValidFireAssumptions({ ...valid, annualSpend: Number.NaN })).toBe(false);
    expect(isValidFireAssumptions({ ...valid, annualReturnPct: -100.01 })).toBe(false);
    expect(isValidFireAssumptions({ ...valid, annualReturnPct: 100.01 })).toBe(false);
  });
});

describe("monthly income", () => {
  it("buckets confirmed payouts by month times quantity", () => {
    const m = monthlyIncome([
      {
        quantity: 10,
        toUsd: (a) => a,
        paid: [
          { date: "2026-03-12", amount: 0.5 },
          { date: "2026-06-12", amount: 0.5 },
        ],
      },
    ]);
    expect(m[2]).toBe(5);
    expect(m[5]).toBe(5);
    expect(m[0]).toBe(0);
  });
});
