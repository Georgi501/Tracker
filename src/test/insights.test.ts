import { describe, expect, it } from "vitest";
import { concentration, dividendRows, goalProjection, requiredMonthly } from "@/lib/insights";
import type { Holding } from "@/lib/portfolio";

const h = (symbol: string, value: number, sector: string): Holding => ({ asset: { id: symbol, name: symbol, symbol, type: "stock", sector, region: "North America", price: 1, change24h: 0, dividendPerShare: 0, payMonths: [], quoteCurrency: "USD" }, quantity: value, avgCost: 1, costBasis: value, value, pnl: 0, pnlPct: 0, dayChange: 0 });

describe("concentration", () => {
  it("flags a position above 20%", () => {
    const r = concentration([h("AAPL", 50, "Tech"), h("KO", 25, "Food"), h("PG", 25, "Home")]);
    expect(r.warnings.some((w) => w.kind === "position" && w.name === "AAPL")).toBe(true);
    expect(r.warnings.find((w) => w.kind === "currency")?.weight).toBe(100);
  });
});

describe("dividend rows", () => {
  it("computes yield on cost", () => {
    const [r] = dividendRows([{ symbol: "KO", quantity: 10, value: 700, costBasis: 400, paidUsdPerShare: 2 }]);
    expect(r!.income).toBe(20);
    expect(r!.yocPct).toBe(5);
  });
});

describe("goals", () => {
  it("projects contributions at 0% return", () => {
    expect(goalProjection({ current: 1000, monthly: 100, annualReturnPct: 0, months: 12 })).toBe(2200);
    expect(requiredMonthly({ current: 1000, target: 2200, annualReturnPct: 0, months: 12 })).toBe(100);
  });
});
