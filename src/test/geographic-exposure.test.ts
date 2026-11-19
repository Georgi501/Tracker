import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseBrokerCsv } from "@/lib/csv-import";
import {
  aggregateCountriesToRegions,
  calculatePortfolioGeographicExposure,
  countryToGeoRegion,
  distributeShareTenths,
  GEO_REGIONS,
  initialAssetRegion,
  isGeoProfileStale,
  needsServerCountryLookup,
  normalizeCountryToIso,
  resolveFundExposureEntry,
  resolveInstrumentGeoProfile,
  type FundExposureEntry,
} from "@/lib/geographic-exposure";
import { languages, translateLabel } from "@/lib/i18n";
import { AllocationCard } from "@/components/AllocationCard";
import { GeoExposureDisclosure } from "@/components/GeoExposureDisclosure";

const mockHoldingsState: {
  holdings: Array<{
    asset: {
      id: string;
      symbol: string;
      name: string;
      type: "stock" | "etf" | "crypto" | "bond" | "cash" | "realEstate";
      sector: string;
      region: string;
      country?: string;
      price: number;
      change24h: number;
      dividendPerShare: number;
      payMonths: number[];
    };
    quantity: number;
    avgCost: number;
    costBasis: number;
    value: number;
    pnl: number;
    pnlPct: number;
    dayChange: number;
  }>;
} = {
  holdings: [],
};

vi.mock("@/lib/store", () => ({
  usePortfolio: () => ({
    lang: "en" as const,
    holdings: mockHoldingsState.holdings,
    t: (key: string) => key,
    label: (raw: string) => translateLabel(raw, "en"),
    money: (value: number) => `$${Math.round(value)}`,
  }),
}));

vi.mock("@/components/ShareAllocationButton", () => ({
  ShareAllocationButton: () => null,
}));

const SYNTHETIC_CLEARED_REGISTRY: FundExposureEntry[] = [
  {
    canonicalId: "synth-us-sp500",
    name: "Synthetic US Core ETF",
    issuer: "Synthetic",
    indexName: "Synthetic US 500",
    domicile: "IE",
    assetType: "etf",
    isins: ["XX0000000101"],
    listings: ["SYN500.DE", "SYN500.L"],
    aliases: ["SYN500"],
    countries: { US: 100 },
    source: "Authorized synthetic dataset",
    sourceUrl: "https://example.test",
    methodology: "Deterministic calculation fixture",
    asOfDate: "2026-11-19",
    dataQuality: "verified-single-region",
    isBenchmarkProxy: false,
    licenseStatus: "cleared",
    redistributionCleared: true,
  },
  {
    canonicalId: "synth-global-all",
    name: "Synthetic Global ETF",
    issuer: "Synthetic",
    indexName: "Synthetic World",
    domicile: "IE",
    assetType: "etf",
    isins: ["XX0000000202"],
    listings: ["SYNGLOB.DE"],
    aliases: ["SYNGLOB"],
    countries: { US: 55, DE: 15, JP: 10, TW: 10, BR: 4, OTHR: 5, CASHD_C: 1 },
    source: "Authorized synthetic dataset",
    sourceUrl: "https://example.test",
    methodology: "Deterministic calculation fixture with OTHR and CASHD_C",
    asOfDate: "2026-11-19",
    dataQuality: "issuer-reported",
    isBenchmarkProxy: false,
    licenseStatus: "cleared",
    redistributionCleared: true,
  },
];

describe("Category A — Instrument identity resolution", () => {
  it("resolves identical funds across exchanges and preserves ISIN distinctness without third-party weights", () => {
    const xetraVwce = resolveFundExposureEntry({ symbol: "VWCE.DE" });
    const lseVwra = resolveFundExposureEntry({ symbol: "VWRA.L" });
    const isinAcc = resolveFundExposureEntry({ isin: "IE00BK5BQT80" });
    const isinDist = resolveFundExposureEntry({ isin: "IE00B3RBWM25" });

    expect(xetraVwce?.canonicalId).toBe("vanguard-ftse-all-world");
    expect(lseVwra?.canonicalId).toBe(xetraVwce?.canonicalId);
    expect(isinAcc?.canonicalId).toBe(xetraVwce?.canonicalId);
    expect(isinDist?.canonicalId).toBe(xetraVwce?.canonicalId);
    expect(xetraVwce?.redistributionCleared).toBe(false);
    expect(xetraVwce?.countries).toBeUndefined();

    // Uncatalogued ticker does NOT match an arbitrary base prefix via .split(".")[0]
    expect(resolveFundExposureEntry({ symbol: "CUSTOMFUND.DE" })).toBeNull();
  });

  it("rejects bare ticker matching when a valid conflicting ISIN is supplied", () => {
    expect(resolveFundExposureEntry({ symbol: "VWCE.DE", isin: "IE00B9999999" })).toBeNull();

    const conflictProfile = resolveInstrumentGeoProfile({
      symbol: "VWCE.DE",
      name: "Conflicting ISIN ETF",
      type: "etf",
      isin: "IE00B9999999",
    });
    expect(conflictProfile.dataQuality).toBe("unavailable");
    expect(conflictProfile.regions).toEqual({ Unknown: 1 });
  });
});

describe("Category B — Country taxonomy & asset classification", () => {
  it("maps key countries into mutually exclusive regions cleanly", () => {
    expect(countryToGeoRegion("US")).toBe("North America");
    expect(countryToGeoRegion("MX")).toBe("Latin America");
    expect(countryToGeoRegion("GB")).toBe("Europe");
    expect(countryToGeoRegion("CH")).toBe("Europe");
    expect(countryToGeoRegion("TW")).toBe("Asia-Pacific");
    expect(countryToGeoRegion("CN")).toBe("Asia-Pacific");
    expect(countryToGeoRegion("SA")).toBe("Middle East");
    expect(countryToGeoRegion("South Africa")).toBe("Africa");
    expect(normalizeCountryToIso("United States of America")).toBe("US");
  });

  it("resolves cleared synthetic fund weights despite poisoned EUR/Europe DB metadata", () => {
    const profile = resolveInstrumentGeoProfile(
      {
        symbol: "SYN500.DE",
        name: "Synthetic US Core ETF",
        type: "etf",
        region: "Europe",
      },
      { registry: SYNTHETIC_CLEARED_REGISTRY },
    );
    expect(profile.kind).toBe("fund");
    expect(profile.regions).toEqual({ "North America": 1 });
    expect(profile.dataQuality).toBe("verified-single-region");
  });

  it("classifies ASML US ADR by corporate HQ filing (Netherlands -> Europe), not USD currency", () => {
    const profile = resolveInstrumentGeoProfile({
      symbol: "ASML",
      name: "ASML Holding",
      type: "stock",
      region: "North America",
    });
    expect(profile.kind).toBe("equity");
    expect(profile.countryCode).toBe("NL");
    expect(profile.regions).toEqual({ Europe: 1 });
    expect(profile.source).toBe("Public corporate HQ filing");
    expect(profile.methodology).toMatch(/Reported company headquarters \(HQ\)/i);
    expect(profile.methodology).toMatch(/Does not represent revenue exposure/i);
  });

  it("separates Unknown residuals and Non-Geographic cash/derivatives cleanly in multi-region funds", () => {
    const profile = resolveInstrumentGeoProfile(
      { symbol: "SYNGLOB.DE", name: "Synthetic Global ETF", type: "etf" },
      { registry: SYNTHETIC_CLEARED_REGISTRY },
    );
    expect(profile.regions["North America"]).toBeCloseTo(0.55, 6);
    expect(profile.regions.Europe).toBeCloseTo(0.15, 6);
    expect(profile.regions["Asia-Pacific"]).toBeCloseTo(0.2, 6);
    expect(profile.regions["Latin America"]).toBeCloseTo(0.04, 6);
    expect(profile.regions.Unknown).toBeCloseTo(0.05, 6);
    expect(profile.regions["Non-Geographic"]).toBeCloseTo(0.01, 6);
    expect((profile.regions as Record<string, number>)["Emerging Markets"]).toBeUndefined();
  });

  it("distinguishes Crypto/Cash (Non-Geographic) from Unknown holdings", () => {
    expect(
      resolveInstrumentGeoProfile({ symbol: "BTC", name: "Bitcoin", type: "crypto" }).regions,
    ).toEqual({ "Non-Geographic": 1 });
    expect(
      resolveInstrumentGeoProfile({ symbol: "EUR", name: "Euro Cash", type: "cash" }).regions,
    ).toEqual({ "Non-Geographic": 1 });
    const unknown = resolveInstrumentGeoProfile({
      symbol: "NICHE_UNKNOWN_ETF",
      name: "Unknown Fund",
      type: "etf",
      region: "Europe",
    });
    expect(unknown.dataQuality).toBe("unavailable");
    expect(unknown.regions).toEqual({ Unknown: 1 });
  });
});

describe("Category C — Portfolio arithmetic, rounding & denominator preservation", () => {
  it("computes synthetic weighted look-through exactly (6000 @ 55% US / 15% DE + ...)", () => {
    const summary = calculatePortfolioGeographicExposure(
      [
        {
          value: 6000,
          asset: { symbol: "SYNGLOB.DE", name: "Synthetic Global ETF", type: "etf" },
        },
        {
          value: 4000,
          asset: { symbol: "SYN500.DE", name: "Synthetic US Core ETF", type: "etf" },
        },
      ],
      (v) => v,
      { registry: SYNTHETIC_CLEARED_REGISTRY },
    );

    expect(summary.totalValue).toBe(10000);
    // 6000*0.55 + 4000 = 7300 (73%)
    expect(summary.rows.find((r) => r.region === "North America")?.share).toBeCloseTo(0.73, 8);
    expect(summary.rows.find((r) => r.region === "Asia-Pacific")?.share).toBeCloseTo(0.12, 8);
    expect(summary.rows.find((r) => r.region === "Europe")?.share).toBeCloseTo(0.09, 8);
    expect(summary.rows.find((r) => r.region === "Unknown")?.share).toBeCloseTo(0.03, 8);
    expect(summary.rows.find((r) => r.region === "Non-Geographic")?.share).toBeCloseTo(0.006, 8);
  });

  it("never rescales 70% known exposure to 100%; keeps unresolved 30% as Unknown", () => {
    const summary = calculatePortfolioGeographicExposure(
      [
        {
          value: 700,
          asset: { symbol: "SYN500.DE", name: "Synthetic US Core", type: "etf" },
        },
        {
          value: 300,
          asset: { symbol: "UNRES.DE", name: "Unresolved Fund", type: "etf", region: "Europe" },
        },
      ],
      (v) => v,
      { registry: SYNTHETIC_CLEARED_REGISTRY },
    );

    expect(summary.totalValue).toBe(1000);
    expect(summary.rows.find((r) => r.region === "North America")?.share).toBeCloseTo(0.7, 6);
    expect(summary.rows.find((r) => r.region === "Unknown")?.share).toBeCloseTo(0.3, 6);
    expect(summary.rows.find((r) => r.region === "Europe")).toBeUndefined();
  });

  it("distributes tenths cleanly to exact 100.0% via Hamilton largest-remainder rounding", () => {
    const sampleValues = [11667.1, 4595.4, 2922.2, 2731.3, 606.8, 227.0, 170.6, 144.6];
    const tenths = distributeShareTenths(sampleValues);
    expect(tenths.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(tenths.every((t) => Number.isInteger(t) && t >= 0)).toBe(true);
  });

  it("handles zero-value portfolios, staleness detection, and lookup filters safely", () => {
    expect(
      calculatePortfolioGeographicExposure([
        { value: 0, asset: { symbol: "AAPL", name: "Apple", type: "stock" } },
      ]).rows,
    ).toEqual([]);
    expect(isGeoProfileStale("2025-01-01", 90, Date.parse("2026-11-19T00:00:00Z"))).toBe(true);
    expect(isGeoProfileStale("2026-11-17", 90, Date.parse("2026-11-19T00:00:00Z"))).toBe(false);
    expect(needsServerCountryLookup({ symbol: "VWCE.DE", type: "etf" })).toBe(false);
    expect(needsServerCountryLookup({ symbol: "AAPL", type: "stock" })).toBe(false);
    expect(needsServerCountryLookup({ symbol: "BTC", type: "crypto" })).toBe(false);
    expect(needsServerCountryLookup({ symbol: "CUSTOM_FR.PA", type: "stock" })).toBe(true);
    expect(aggregateCountriesToRegions({ TW: 50, MX: 25, TR: 25 })).toEqual({
      "Asia-Pacific": 0.5,
      "Latin America": 0.25,
      "Middle East": 0.25,
    });
  });
});

describe("Category D — CSV import & legacy DB compatibility", () => {
  it("parses Trading 212 ISIN and writes neutral Unknown initial DB region for withheld ETFs", () => {
    const csv =
      "Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Total,Currency (Total)\n" +
      "Market buy,2026-01-15 10:00:00,IE00B5BMR087,SXR8.DE,iShares Core S&P 500 UCITS ETF,10,500,EUR,5000,EUR\n";
    const parsed = parseBrokerCsv("trading212", csv);
    expect(parsed[0]).toMatchObject({
      symbol: "SXR8.DE",
      isin: "IE00B5BMR087",
      assetType: "etf",
      currency: "EUR",
    });
    expect(
      initialAssetRegion({
        symbol: parsed[0]!.symbol,
        name: parsed[0]!.name,
        type: parsed[0]!.assetType,
        isin: parsed[0]!.isin,
      }),
    ).toBe("Unknown");
  });

  it("overrides poisoned legacy EUR/Europe ETF labels cleanly without overwriting DB history", () => {
    const summary = calculatePortfolioGeographicExposure([
      {
        value: 9800,
        asset: {
          symbol: "SXR8.DE",
          name: "iShares Core S&P 500 UCITS",
          type: "stock",
          region: "Europe",
        },
      },
      {
        value: 200,
        asset: { symbol: "SAP.DE", name: "SAP SE", type: "stock", region: "North America" },
      },
    ]);
    expect(summary.rows.find((r) => r.region === "Unknown")?.share).toBeCloseTo(0.98, 4);
    expect(summary.rows.find((r) => r.region === "Europe")?.share).toBeCloseTo(0.02, 4);
    expect(summary.licenseWithheldAssets).toEqual(["SXR8.DE"]);
  });
});

describe("Category E — UI, 5-language labels, & compliance-safe provenance disclosure", () => {
  afterEach(() => {
    cleanup();
    mockHoldingsState.holdings = [];
  });

  it("supplies complete 5-language translations for all mutually exclusive geographic regions", () => {
    for (const lang of languages) {
      for (const region of GEO_REGIONS) {
        const translated = translateLabel(region, lang.code);
        expect(translated.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("renders compliance-safe Region allocation with clear separation of withheld ETFs, unavailable assets, and HQ locations", () => {
    mockHoldingsState.holdings = [
      {
        asset: {
          id: "1",
          symbol: "SXR8.DE",
          name: "iShares Core S&P 500 UCITS",
          type: "stock",
          sector: "Broad Market",
          region: "Europe",
          price: 500,
          change24h: 0.4,
          dividendPerShare: 0,
          payMonths: [],
        },
        quantity: 10,
        avgCost: 450,
        costBasis: 4500,
        value: 5000,
        pnl: 500,
        pnlPct: 11.1,
        dayChange: 0,
      },
      {
        asset: {
          id: "2",
          symbol: "MYSTERY",
          name: "Unknown Equity",
          type: "stock",
          sector: "Other",
          region: "North America",
          price: 100,
          change24h: 0,
          dividendPerShare: 0,
          payMonths: [],
        },
        quantity: 50,
        avgCost: 100,
        costBasis: 5000,
        value: 5000,
        pnl: 0,
        pnlPct: 0,
        dayChange: 0,
      },
    ];

    render(createElement(AllocationCard));
    fireEvent.click(screen.getByRole("tab", { name: "byRegion" }));

    expect(screen.getByText("Fund · no country split")).toBeInTheDocument();
    expect(screen.getByText("Unidentified")).toBeInTheDocument();
    expect(screen.queryByText("Unknown / Unclassified")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Not licensed for display/i).length).toBeGreaterThan(0);

    const toggle = screen.getByRole("button", { name: /Methodology & data sources/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Distinguishes reported corporate HQ location/i)).toBeInTheDocument();
    expect(screen.getByText("SXR8.DE")).toBeInTheDocument();
    expect(screen.getByText("MYSTERY")).toBeInTheDocument();
    expect(
      screen.getByText(/Third-party breakdown not licensed for commercial display/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Pending/i)).not.toBeInTheDocument();
  });

  it("Focus tab shows verified fund scope without country percentages and keeps unknowns unclassified", () => {
    const mk = (id: string, symbol: string, value: number) => ({
      asset: {
        id,
        symbol,
        name: symbol,
        type: "etf" as const,
        sector: "Broad Market",
        region: "Europe",
        price: 1,
        change24h: 0,
        dividendPerShare: 0,
        payMonths: [],
      },
      quantity: 1,
      avgCost: 1,
      costBasis: value,
      value,
      pnl: 0,
      pnlPct: 0,
      dayChange: 0,
    });
    mockHoldingsState.holdings = [mk("1", "SPYL.DE", 9000), mk("2", "MYSTERY.DE", 1000)];
    render(createElement(AllocationCard));
    fireEvent.click(screen.getByRole("tab", { name: "Focus" }));
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("Unclassified")).toBeInTheDocument();
    expect(screen.getByTestId("focus-notice")).toHaveTextContent(
      /not underlying country exposure/i,
    );
    expect(screen.queryByText("Europe")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /How focus is determined/i }));
    expect(screen.getByText(/S&P 500 Index/)).toBeInTheDocument();
  });

  it("exposes accessible tab semantics with roving keyboard navigation", () => {
    mockHoldingsState.holdings = [];
    render(createElement(AllocationCard));
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(tabs[0]!, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Focus" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Focus" }), { key: "Home" });
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });
  it("surfaces outdated authorized sources, unpriced positions, and minor-cutoff OTHR cleanly", () => {
    const summary = calculatePortfolioGeographicExposure(
      [
        {
          value: 10000,
          asset: { symbol: "SYNGLOB.DE", name: "Synthetic Global", type: "etf" },
        },
      ],
      (v) => v,
      { registry: SYNTHETIC_CLEARED_REGISTRY, now: Date.parse("2027-06-01T00:00:00Z") },
    );
    expect(summary.staleValue).toBe(10000);

    render(createElement(GeoExposureDisclosure, { summary, lang: "en", unpricedCount: 1 }));
    expect(screen.getByText(/Outdated:/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Methodology & data sources/i }));
    expect(screen.getByText(/reporting threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/older than the recommended refresh window/i)).toBeInTheDocument();
    expect(screen.getByText(/1 position has no current market valuation/i)).toBeInTheDocument();
    expect(screen.queryByText(/Geographic breakdown unavailable for:/i)).not.toBeInTheDocument();
  });
});

describe("Category F — Non-regression & distribution safety", () => {
  afterEach(() => {
    cleanup();
    mockHoldingsState.holdings = [];
  });

  it("preserves holding objects/valuations and excludes unlicensed fund weights cleanly", () => {
    const h1 = {
      asset: {
        id: "1",
        symbol: "VWCE.DE",
        name: "Vanguard FTSE All-World UCITS ETF",
        type: "stock" as const,
        sector: "Broad Market",
        region: "Global",
        price: 120,
        change24h: 0.5,
        dividendPerShare: 0,
        payMonths: [],
      },
      quantity: 100,
      avgCost: 100,
      costBasis: 10000,
      value: 12000,
      pnl: 2000,
      pnlPct: 20,
      dayChange: 60,
    };
    const h2 = {
      asset: {
        id: "2",
        symbol: "BTC",
        name: "Bitcoin",
        type: "crypto" as const,
        sector: "Crypto",
        region: "North America",
        price: 80000,
        change24h: -1,
        dividendPerShare: 0,
        payMonths: [],
      },
      quantity: 0.1,
      avgCost: 60000,
      costBasis: 6000,
      value: 8000,
      pnl: 2000,
      pnlPct: 33.33,
      dayChange: -80,
    };

    mockHoldingsState.holdings = [h1, h2];
    const summary = calculatePortfolioGeographicExposure(mockHoldingsState.holdings);
    expect(summary.totalValue).toBe(20000);
    expect(summary.licenseWithheldAssets).toEqual(["VWCE.DE"]);
    expect(summary.unknownValue).toBe(12000);
    expect(summary.nonGeographicValue).toBe(8000);
    expect(h1.value).toBe(12000);
    expect(h2.value).toBe(8000);
    expect(h1.pnl).toBe(2000);

    // Ensure every built-in catalog entry carries zero embedded third-party weights
    for (const sym of [
      "IWDA.AS",
      "VWCE.DE",
      "IS3N.DE",
      "IUSQ.DE",
      "IXUA.DE",
      "SXRV.DE",
      "SXR8.DE",
    ]) {
      const p = resolveInstrumentGeoProfile({ symbol: sym, name: sym, type: "etf" });
      expect(p.dataQuality).toBe("license-restricted");
      expect(p.redistributionCleared).toBe(false);
      expect(p.countries).toBeNull();
    }
  });
});
