import { describe, expect, it } from "vitest";
import { fifoTaxReport, rebalance, riskMetrics } from "@/lib/tools";

describe("FIFO tax report", () => {
  it("matches sells against oldest lots first", () => {
    const r = fifoTaxReport([
      { id: "1", assetId: "a", kind: "buy", quantity: 10, price: 100, date: "2024-01-01" },
      { id: "2", assetId: "a", kind: "buy", quantity: 10, price: 200, date: "2024-06-01" },
      { id: "3", assetId: "a", kind: "sell", quantity: 15, price: 300, date: "2025-03-01" },
      { id: "4", assetId: "a", kind: "dividend", quantity: 1, price: 25, date: "2025-04-01" },
    ]);
    const y = r.find((x) => x.year === 2025)!;
    expect(y.cost).toBe(2000);
    expect(y.realized).toBe(2500);
    expect(y.dividends).toBe(25);
  });
});

describe("rebalance", () => {
  it("puts new cash into underweight classes only", () => {
    const r = rebalance({ etf: 900, crypto: 100 }, { etf: 50, crypto: 50 }, 200);
    expect(r["crypto"]).toBeCloseTo(200);
    expect(r["etf"]).toBeCloseTo(0);
  });
});

describe("risk metrics", () => {
  it("reports max drawdown from peak", () => {
    const vals = [100, 110, 120, 90, 95, 100, 105, 110, 115, 120, 125, 130];
    const m = riskMetrics(vals.map((v, i) => ({ t: i, v, flow: 0 })))!;
    expect(m.maxDrawdown).toBeCloseTo(-25);
  });
});
