import { describe, expect, it } from "vitest";
import { calculateEtfOverlap } from "@/lib/etf-overlap";
import type { Holding } from "@/lib/portfolio";

const holding = (symbol: string, type: Holding["asset"]["type"], value: number): Holding =>
  ({
    asset: { symbol, name: symbol, type },
    value,
  }) as Holding;

describe("ETF look-through exposure", () => {
  it("combines the same underlying exposure across ETFs and direct stock holdings", () => {
    const result = calculateEtfOverlap(
      [holding("ETF1", "etf", 60), holding("ETF2", "etf", 20), holding("AAPL", "stock", 20)],
      [
        { symbol: "ETF1", holdings: [{ symbol: "AAPL", name: "Apple", weight: 0.1 }] },
        { symbol: "ETF2", holdings: [{ symbol: "AAPL", name: "Apple", weight: 0.25 }] },
      ],
    );
    expect(result[0]).toMatchObject({
      symbol: "AAPL",
      name: "Apple",
      weight: 0.31,
      sources: ["ETF1", "ETF2", "AAPL"],
    });
  });

  it("does not fabricate exposures when provider compositions are unavailable", () => {
    expect(calculateEtfOverlap([holding("ETF1", "etf", 100)], [])).toEqual([]);
  });
});
