import { describe, expect, it } from "vitest";
import {
  dcfAnalysis,
  dcfValue,
  dcfValueFromFundamentals,
  potentialUpside,
  scenario,
  valuationGap,
  type DcfInputs,
  type DcfFundamentals,
} from "@/lib/dcf";

const validInputs: DcfInputs = {
  fcf: 100,
  growth: 0.05,
  discount: 0.1,
  terminal: 0.02,
  cash: 50,
  debt: 20,
  shares: 10,
};
const validFundamentals: DcfFundamentals = {
  quoteType: "EQUITY",
  currency: "USD",
  finCurrency: "USD",
  fcf: 100,
  fcfPeriodEnd: "2026-06-30T00:00:00.000Z",
  fcfPeriodType: "12M",
  operatingCashFlow: 150,
  capitalExpenditure: 50,
  cash: 50,
  debt: 20,
  shares: 10,
};

describe("dcf", () => {
  it("zero growth equals perpetuity-like value", () => {
    const value = dcfValue({
      ...validInputs,
      fcf: 100,
      growth: 0,
      discount: 0.1,
      terminal: 0,
      cash: 0,
      debt: 0,
      shares: 1,
    });
    expect(value).toBeCloseTo(1000, 6);
  });

  it("adds cash and subtracts debt per share", () => {
    const value = dcfValue({
      ...validInputs,
      fcf: 100,
      growth: 0,
      discount: 0.1,
      terminal: 0,
      cash: 500,
      debt: 300,
      shares: 2,
    });
    expect(value).toBeCloseTo(600, 6);
  });

  it("rejects non-finite, incomplete, out-of-range and unstable assumptions", () => {
    const invalidInputs: DcfInputs[] = [
      { ...validInputs, fcf: Number.NaN },
      { ...validInputs, growth: Number.POSITIVE_INFINITY },
      { ...validInputs, growth: -1 },
      { ...validInputs, discount: 0 },
      { ...validInputs, terminal: 0.11 },
      { ...validInputs, cash: -1 },
      { ...validInputs, debt: -1 },
      { ...validInputs, shares: 0 },
      { ...validInputs, years: 0 },
      { ...validInputs, years: 1.5 },
      { ...validInputs, years: 11 },
    ];

    for (const inputs of invalidInputs) {
      expect(dcfAnalysis(inputs)).toBeNull();
    }

    expect(
      dcfValue({
        ...validInputs,
        discount: 0.02,
        terminal: 0.02,
      }),
    ).toBeNull();
  });

  it("reports the operating cash-flow and terminal-value contributions", () => {
    const analysis = dcfAnalysis(validInputs);

    expect(analysis).not.toBeNull();
    expect(analysis!.valuePerShare).toBeCloseTo(dcfValue(validInputs)!);
    expect(analysis!.presentValueOfCashFlows).toBeGreaterThan(0);
    expect(analysis!.presentValueOfTerminalValue).toBeGreaterThan(0);
    expect(analysis!.terminalValueShare).toBeGreaterThan(0);
    expect(analysis!.terminalValueShare).toBeLessThan(1);
  });

  it("keeps bear and bull scenarios on the expected sides of base", () => {
    const base = { fcf: 100, cash: 0, debt: 0, shares: 1 };
    const bear = dcfValue({ ...base, ...scenario("bear", 0.1) }) ?? 0;
    const middle = dcfValue({ ...base, ...scenario("base", 0.1) }) ?? 0;
    const bull = dcfValue({ ...base, ...scenario("bull", 0.1) }) ?? 0;
    expect(bear).toBeLessThan(middle);
    expect(middle).toBeLessThan(bull);
  });

  it("keeps bear and bull growth assumptions directional when baseline growth is negative", () => {
    const bear = scenario("bear", -0.02);
    const base = scenario("base", -0.02);
    const bull = scenario("bull", -0.02);

    expect(bear.growth).toBeLessThan(base.growth);
    expect(bull.growth).toBeGreaterThan(base.growth);
  });

  it("returns null for invalid comparisons", () => {
    expect(valuationGap(200, 100)).toBe(0.5);
    expect(valuationGap(100, 150)).toBe(-0.5);
    expect(valuationGap(0, 100)).toBeNull();
    expect(valuationGap(Number.NaN, 100)).toBeNull();
  });

  it("only values supported equities with complete, matching-currency fundamentals", () => {
    const assumptions = scenario("base", 0.05);

    expect(dcfValueFromFundamentals(validFundamentals, assumptions)).not.toBeNull();
    expect(
      dcfValueFromFundamentals({ ...validFundamentals, quoteType: "ETF" }, assumptions),
    ).toBeNull();
    expect(
      dcfValueFromFundamentals({ ...validFundamentals, finCurrency: "EUR" }, assumptions),
    ).toBeNull();
    expect(dcfValueFromFundamentals({ ...validFundamentals, cash: null }, assumptions)).toBeNull();
    expect(
      dcfValueFromFundamentals({ ...validFundamentals, fcfPeriodEnd: null }, assumptions),
    ).toBeNull();
    expect(
      dcfValueFromFundamentals({ ...validFundamentals, fcfPeriodType: null }, assumptions),
    ).toBeNull();
    expect(
      dcfValueFromFundamentals({ ...validFundamentals, fcfPeriodEnd: "not-a-date" }, assumptions),
    ).toBeNull();
    expect(
      dcfValueFromFundamentals({ ...validFundamentals, capitalExpenditure: null }, assumptions),
    ).toBeNull();
    expect(dcfValueFromFundamentals({ ...validFundamentals, fcf: 99 }, assumptions)).toBeNull();
  });

  it("calculates upside relative to the market price", () => {
    expect(potentialUpside(200, 100)).toBe(1);
    expect(potentialUpside(100, 200)).toBe(-0.5);
    expect(potentialUpside(200, 0)).toBeNull();
  });
});
