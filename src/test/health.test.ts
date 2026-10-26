import { describe, expect, it } from "vitest";
import { portfolioHealth, stressScenarios } from "@/lib/health";
import type { Holding } from "@/lib/portfolio";

const h = (
  symbol: string,
  value: number,
  type: Holding["asset"]["type"] = "stock",
  quoteCurrency = "USD",
): Holding =>
  ({
    asset: { id: symbol, symbol, name: symbol, type, quoteCurrency, sector: "Tech" },
    quantity: 1,
    avgCost: value,
    costBasis: value,
    value,
    pnl: 0,
    pnlPct: 0,
    dayChange: 0,
  }) as unknown as Holding;

describe("portfolio health", () => {
  it("returns null without priced holdings", () => {
    expect(portfolioHealth([h("A", Number.NaN)])).toBeNull();
  });
  it("flags a single position as fully concentrated", () => {
    const r = portfolioHealth([h("META", 1000)])!;
    expect(r.parts.find((p) => p.key === "position")!.score).toBe(0);
    expect(r.topPosition).toEqual({ symbol: "META", weight: 100 });
  });
  it("a position at 20% weight keeps full position score", () => {
    const r = portfolioHealth(["A", "B", "C", "D", "E"].map((s) => h(s, 100)))!;
    expect(r.parts.find((p) => p.key === "position")!.score).toBe(100);
  });
});

describe("stress scenarios", () => {
  it("market -20% hits stocks and doubles for crypto", () => {
    const s = stressScenarios([h("A", 1000), h("BTC", 1000, "crypto")], "EUR");
    expect(s.find((x) => x.key === "market")!.loss).toBe(600);
  });
  it("USD drop has no effect when base is USD", () => {
    expect(stressScenarios([h("A", 1000)], "USD").find((x) => x.key === "usd")!.loss).toBe(0);
  });
});

import { lastWeek } from "@/lib/health";
describe("weekly digest window", () => {
  it("keeps only the last 7 days of points", () => {
    const d = 86400000;
    const pts = Array.from({ length: 20 }, (_, i) => ({ t: i * d }));
    expect(lastWeek(pts).map((p) => p.t / d)).toEqual([12, 13, 14, 15, 16, 17, 18, 19]);
  });
});
