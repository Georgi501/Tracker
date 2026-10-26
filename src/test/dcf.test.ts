import { describe, expect, it } from "vitest";
import { dcfValue, scenario, valuationGap } from "@/lib/dcf";

describe("dcf", () => {
  it("zero growth equals perpetuity-like value", () => {
    const v = dcfValue({
      fcf: 100,
      growth: 0,
      discount: 0.1,
      terminal: 0,
      cash: 0,
      debt: 0,
      shares: 1,
    })!;
    expect(v).toBeCloseTo(1000, 6);
  });
  it("adds cash and subtracts debt per share", () => {
    const v = dcfValue({
      fcf: 100,
      growth: 0,
      discount: 0.1,
      terminal: 0,
      cash: 500,
      debt: 300,
      shares: 2,
    })!;
    expect(v).toBeCloseTo(600, 6);
  });
  it("is not applicable for negative FCF or discount <= terminal", () => {
    expect(
      dcfValue({
        fcf: -1,
        growth: 0.1,
        discount: 0.1,
        terminal: 0.02,
        cash: 0,
        debt: 0,
        shares: 1,
      }),
    ).toBeNull();
    expect(
      dcfValue({
        fcf: 1,
        growth: 0.1,
        discount: 0.02,
        terminal: 0.02,
        cash: 0,
        debt: 0,
        shares: 1,
      }),
    ).toBeNull();
  });
  it("bear < base < bull", () => {
    const base = { fcf: 100, cash: 0, debt: 0, shares: 1 };
    const [b, m, u] = (["bear", "base", "bull"] as const).map(
      (c) => dcfValue({ ...base, ...scenario(c, 0.1) }) ?? 0,
    ) as [number, number, number];
    expect(b).toBeLessThan(m);
    expect(m).toBeLessThan(u);
  });
  it("gap sign", () => {
    expect(valuationGap(200, 100)).toBe(0.5);
    expect(valuationGap(100, 150)).toBe(-0.5);
  });
});
