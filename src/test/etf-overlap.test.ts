import { describe, expect, it } from "vitest";
import {
  calculateEtfOverlap,
  calculatePortfolioExposures,
  type EtfExposureProfile,
} from "@/lib/etf-overlap";
import type { FundExposureEntry } from "@/lib/geographic-exposure";
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

const SYNTHETIC_OVERLAP_PROFILES: Record<string, EtfExposureProfile> = {
  SYN_US: {
    symbol: "SYN_US",
    sectors: { Technology: 0.4, Financials: 0.3, Industrials: 0.3 },
    regions: { "North America": 1 },
  },
  SYN_ALL: {
    symbol: "SYN_ALL",
    sectors: { Technology: 0.2, Financials: 0.5, Healthcare: 0.3 },
    regions: { "North America": 0.6, Europe: 0.25, "Asia-Pacific": 0.15 },
  },
};

const SYNTHETIC_GEO_REGISTRY: FundExposureEntry[] = [
  {
    canonicalId: "synth-us",
    name: "Synthetic US ETF",
    issuer: "Test",
    indexName: "Test US",
    isins: ["XX0000000001"],
    listings: ["SYN_US"],
    countries: { US: 100 },
    source: "Synthetic fixture",
    sourceUrl: "https://example.test",
    methodology: "Synthetic unit test fixture",
    asOfDate: "2026-11-19",
    dataQuality: "issuer-reported",
    isBenchmarkProxy: false,
    licenseStatus: "cleared",
    redistributionCleared: true,
  },
  {
    canonicalId: "synth-all",
    name: "Synthetic World ETF",
    issuer: "Test",
    indexName: "Test World",
    isins: ["XX0000000002"],
    listings: ["SYN_ALL"],
    countries: { US: 60, DE: 20, JP: 15, OTHR: 5 },
    source: "Synthetic fixture",
    sourceUrl: "https://example.test",
    methodology: "Synthetic unit test fixture",
    asOfDate: "2026-11-19",
    dataQuality: "issuer-reported",
    isBenchmarkProxy: false,
    licenseStatus: "cleared",
    redistributionCleared: true,
  },
];

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

  it("decomposes authorized synthetic ETFs into underlying sectors and mutually exclusive regions", () => {
    const portfolio = [
      holding("SYN_US", "etf", 1000, "Diversified", "North America"),
      holding("SYN_ALL", "etf", 1000, "Diversified", "Global"),
      holding("AAPL", "stock", 500, "Technology", "North America"),
    ];

    const sectorLookThrough = calculatePortfolioExposures(
      portfolio,
      "sector",
      "lookThrough",
      (v) => v,
      SYNTHETIC_OVERLAP_PROFILES,
    );
    expect(sectorLookThrough.decomposedEtfs).toEqual(["SYN_US", "SYN_ALL"]);
    expect(sectorLookThrough.fallbackEtfs).toEqual([]);
    const techRow = sectorLookThrough.rows.find((row) => row.name === "Technology");
    // 1000 * 0.4 + 1000 * 0.2 + 500 = 1100
    expect(techRow?.value).toBeCloseTo(1100);
    expect(sectorLookThrough.rows.reduce((sum, row) => sum + row.value, 0)).toBeCloseTo(2500);

    const regionLookThrough = calculatePortfolioExposures(
      portfolio,
      "region",
      "lookThrough",
      (v) => v,
      undefined,
      { registry: SYNTHETIC_GEO_REGISTRY },
    );
    // 1000 (SYN_US) + 600 (SYN_ALL) + 500 (AAPL) = 2100
    expect(regionLookThrough.rows.find((row) => row.name === "North America")?.value).toBeCloseTo(
      2100,
      4,
    );
    expect(regionLookThrough.rows.find((row) => row.name === "Europe")?.value).toBeCloseTo(200, 4);
    expect(regionLookThrough.rows.find((row) => row.name === "Asia-Pacific")?.value).toBeCloseTo(
      150,
      4,
    );
    expect(regionLookThrough.rows.find((row) => row.name === "Unknown")?.value).toBeCloseTo(50, 4);
    expect(regionLookThrough.rows.find((row) => row.name === "Emerging Markets")).toBeUndefined();
  });

  it("preserves direct holdings mode and falls back cleanly for unsupported ETFs without fabricating weights", () => {
    const portfolio = [
      holding("SYN_US", "etf", 1000, "Diversified", "North America"),
      holding("NICHE_ETF", "etf", 400, "Industrials", "Europe"),
    ];

    const direct = calculatePortfolioExposures(portfolio, "sector", "direct");
    expect(direct.decomposedEtfs).toEqual([]);
    expect(direct.rows).toEqual([
      { name: "Diversified", value: 1000 },
      { name: "Industrials", value: 400 },
    ]);

    const lookThrough = calculatePortfolioExposures(
      portfolio,
      "sector",
      "lookThrough",
      (v) => v,
      SYNTHETIC_OVERLAP_PROFILES,
    );
    expect(lookThrough.decomposedEtfs).toEqual(["SYN_US"]);
    expect(lookThrough.fallbackEtfs).toEqual(["NICHE_ETF"]);
    expect(lookThrough.rows.find((row) => row.name === "Industrials")?.value).toBeCloseTo(700);
  });

  it("omits unlicensed third-party ETF weights by default without embedding or falling back to currency labels", () => {
    const portfolio = [
      holding("VWCE.DE", "etf", 1000, "Diversified", "Europe"),
      holding("AAPL", "stock", 500, "Technology", "Global"),
    ];
    const safeRegion = calculatePortfolioExposures(portfolio, "region", "lookThrough");
    expect(safeRegion.decomposedEtfs).toEqual([]);
    expect(safeRegion.fallbackEtfs).toEqual(["VWCE.DE"]);
    expect(safeRegion.rows).toEqual([
      { name: "Unknown", value: 1000 },
      { name: "North America", value: 500 },
    ]);
  });
});
