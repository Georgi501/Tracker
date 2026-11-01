import { describe, expect, it } from "vitest";
import {
  allocationDrift,
  currentAllocationValues,
  parseAllocationTargets,
} from "@/lib/allocation-alerts";
import type { Holding } from "@/lib/portfolio";

function holding(type: Holding["asset"]["type"], value: number): Holding {
  return {
    asset: {
      id: type,
      name: type,
      symbol: type.toUpperCase(),
      type,
      sector: "",
      region: "",
      price: 1,
      change24h: 0,
      dividendPerShare: 0,
      payMonths: [],
    },
    quantity: value,
    avgCost: value,
    costBasis: value,
    value,
    pnl: 0,
    pnlPct: 0,
    dayChange: 0,
  };
}

describe("allocation drift preferences", () => {
  it("accepts only valid 100% allocation targets", () => {
    expect(
      parseAllocationTargets(JSON.stringify({ targets: { stock: 60, etf: 40 }, tolerance: 5 })),
    ).toEqual({ targets: { stock: 60, etf: 40 }, tolerance: 5 });
    expect(
      parseAllocationTargets(JSON.stringify({ targets: { stock: 80, etf: 40 }, tolerance: 5 })),
    ).toBeNull();
    expect(
      parseAllocationTargets(JSON.stringify({ targets: { stock: 60, etf: 40 }, tolerance: 80 })),
    ).toBeNull();
  });

  it("flags configured classes outside the percentage-point tolerance", () => {
    const values = currentAllocationValues([holding("stock", 800), holding("etf", 200)]);
    const rows = allocationDrift(values, {
      targets: { stock: 60, etf: 40, crypto: 0 },
      tolerance: 5,
    });
    expect(rows.find((row) => row.assetType === "stock")).toMatchObject({
      current: 80,
      target: 60,
      deviation: 20,
      outsideTolerance: true,
    });
    expect(rows.find((row) => row.assetType === "etf")?.outsideTolerance).toBe(true);
    expect(rows.find((row) => row.assetType === "crypto")?.outsideTolerance).toBe(false);
  });
});
