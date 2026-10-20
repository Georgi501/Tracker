import { describe, expect, it } from "vitest";
import { fireProjection, monthlyIncome } from "@/lib/pro";

describe("FIRE projection", () => {
  it("uses the 4% rule for the target", () => {
    expect(fireProjection({ current: 0, monthly: 0, annualReturnPct: 0, annualSpend: 24000 }).target).toBe(600000);
  });
  it("reaches the target with contributions only", () => {
    const r = fireProjection({ current: 0, monthly: 1000, annualReturnPct: 0, annualSpend: 4800 });
    expect(r.years).toBe(10); // 120000 target / 1000 per month
  });
  it("returns null when unreachable", () => {
    expect(fireProjection({ current: 0, monthly: 0, annualReturnPct: 5, annualSpend: 1000 }).years).toBeNull();
  });
});

describe("monthly income", () => {
  it("buckets confirmed payouts by month times quantity", () => {
    const m = monthlyIncome([{ quantity: 10, toUsd: (a) => a, paid: [{ date: "2026-03-12", amount: 0.5 }, { date: "2026-06-12", amount: 0.5 }] }]);
    expect(m[2]).toBe(5);
    expect(m[5]).toBe(5);
    expect(m[0]).toBe(0);
  });
});
