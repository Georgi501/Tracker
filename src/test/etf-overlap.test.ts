import { describe, expect, it } from "vitest";
import { calculateEtfOverlap, calculatePortfolioExposures } from "@/lib/etf-overlap";
import type { Holding } from "@/lib/portfolio";

const holding = (
  symbol: string,
  type: Holding["asset"]["type"],
  value: number,
  sector = "Diversified",
  region = "Global",
): Holding =>
  ({
    asset: { symbol, name: symbol, type, sector, region },
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

  it("decomposes supported index ETFs (VOO, VWCE.DE) into underlying sectors and regions in lookThrough mode", () => {
    const portfolio = [
      holding("VOO", "etf", 1000, "Diversified", "North America"),
      holding("VWCE.DE", "etf", 1000, "Diversified", "Global"),
      holding("AAPL", "stock", 500, "Technology", "North America"),
    ];

    const sectorLookThrough = calculatePortfolioExposures(portfolio, "sector", "lookThrough");
    expect(sectorLookThrough.decomposedEtfs).toEqual(["VOO", "VWCE.DE"]);
    expect(sectorLookThrough.fallbackEtfs).toEqual([]);
    const techRow = sectorLookThrough.rows.find((row) => row.name === "Technology");
    // 1000 * 0.32 (VOO) + 1000 * 0.26 (VWCE) + 500 (AAPL) = 1080
    expect(techRow?.value).toBeCloseTo(1080);
    const totalSectorValue = sectorLookThrough.rows.reduce((sum, row) => sum + row.value, 0);
    expect(totalSectorValue).toBeCloseTo(2500);

    const regionLookThrough = calculatePortfolioExposures(portfolio, "region", "lookThrough");
    const europeRow = regionLookThrough.rows.find((row) => row.name === "Europe");
    expect(europeRow?.value).toBeCloseTo(150);
    const emergingRow = regionLookThrough.rows.find((row) => row.name === "Emerging Markets");
    expect(emergingRow?.value).toBeCloseTo(100);
  });

  it("preserves direct holdings mode and falls back cleanly for unsupported ETFs without fabricating weights", () => {
    const portfolio = [
      holding("VOO", "etf", 1000, "Diversified", "North America"),
      holding("NICHE_ETF", "etf", 400, "Energy", "Europe"),
    ];

    const direct = calculatePortfolioExposures(portfolio, "sector", "direct");
    expect(direct.decomposedEtfs).toEqual([]);
    expect(direct.rows).toEqual([
      { name: "Diversified", value: 1000 },
      { name: "Energy", value: 400 },
    ]);

    const lookThrough = calculatePortfolioExposures(portfolio, "sector", "lookThrough");
    expect(lookThrough.decomposedEtfs).toEqual(["VOO"]);
    expect(lookThrough.fallbackEtfs).toEqual(["NICHE_ETF"]);
    const energyRow = lookThrough.rows.find((row) => row.name === "Energy");
    // 1000 * 0.04 (from VOO) + 400 (fallback direct from NICHE_ETF) = 440
    expect(energyRow?.value).toBeCloseTo(440);
  });
});
