import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculatePortfolioGeographicExposure,
  FUND_EXPOSURE_REGISTRY,
  resolveFundExposureEntry,
} from "@/lib/geographic-exposure";
import {
  calculatePortfolioInvestmentFocus,
  FOCUS_LABELS,
  FUND_FOCUS_CATALOG,
  INVESTMENT_FOCUS_IDS,
  resolveInstrumentFocus,
} from "@/lib/investment-focus";
import { languages } from "@/lib/i18n";
import { geoDisplayRows } from "@/lib/investment-focus";

const etf = (symbol: string, extra: Record<string, unknown> = {}) => ({
  symbol,
  name: symbol,
  type: "etf" as const,
  ...extra,
});

describe("investment focus — acceptance scenarios", () => {
  it("SPYL.DE is United States focus, not Europe from EUR/Xetra", () => {
    const f = resolveInstrumentFocus(etf("SPYL.DE", { region: "Europe" }));
    expect(f.focus).toBe("us");
    expect(f.kind).toBe("fund-mandate");
    expect(f.benchmark).toBe("S&P 500 Index");
  });

  it("VWCE.DE is global all-country; IWDA/EUNL global developed", () => {
    expect(resolveInstrumentFocus(etf("VWCE.DE")).focus).toBe("global-all-country");
    expect(resolveInstrumentFocus(etf("IWDA.AS")).focus).toBe("global-developed");
    expect(resolveInstrumentFocus(etf("EUNL.DE")).focus).toBe("global-developed");
  });

  it("IXUA.DE is developed ex-US; IS3N.DE is emerging markets; EXSA.DE is Europe", () => {
    expect(resolveInstrumentFocus(etf("IXUA.DE")).focus).toBe("developed-ex-us");
    expect(resolveInstrumentFocus(etf("IS3N.DE")).focus).toBe("emerging");
    expect(resolveInstrumentFocus(etf("EXSA.DE")).focus).toBe("europe");
  });

  it("SXR8, VUAA, SXRV and XNAS resolve to US focus; Nasdaq funds flag possible foreign issuers", () => {
    for (const s of ["SXR8.DE", "VUAA.DE"]) {
      const f = resolveInstrumentFocus(etf(s));
      expect(f.focus).toBe("us");
      expect(f.foreignIssuersPossible).toBe(false);
    }
    for (const s of ["SXRV.DE", "XNAS.DE", "XNAS"]) {
      const f = resolveInstrumentFocus(etf(s));
      expect(f.focus).toBe("us");
      expect(f.foreignIssuersPossible).toBe(true);
    }
    expect(resolveFundExposureEntry({ isin: "IE00BMFKG444" })?.canonicalId).toBe(
      "xtrackers-nasdaq100",
    );
  });

  it("unknown ETF stays unclassified and is never inferred from region, currency or exchange", () => {
    const f = resolveInstrumentFocus(etf("MYSTERY.DE", { region: "Europe" }));
    expect(f.focus).toBe("unclassified");
    expect(f.kind).toBe("none");
  });

  it("a conflicting valid ISIN does not borrow the ticker's focus", () => {
    expect(resolveInstrumentFocus(etf("SPYL.DE", { isin: "IE00B9999999" })).focus).toBe(
      "unclassified",
    );
  });

  it("legacy poisoned CSV rows typed as stock still resolve by identity", () => {
    const f = resolveInstrumentFocus({
      symbol: "SXR8.DE",
      name: "x",
      type: "stock",
      region: "North America",
    });
    expect(f.kind).toBe("fund-mandate");
    expect(f.focus).toBe("us");
  });

  it("cash and crypto are non-geographic; HQ-known stocks map by HQ only", () => {
    expect(resolveInstrumentFocus({ symbol: "BTC", name: "b", type: "crypto" }).focus).toBe(
      "non-geographic",
    );
    expect(resolveInstrumentFocus({ symbol: "AAPL", name: "a", type: "stock" }).focus).toBe("us");
    expect(resolveInstrumentFocus({ symbol: "SAP.DE", name: "s", type: "stock" }).focus).toBe(
      "europe",
    );
    expect(resolveInstrumentFocus({ symbol: "TSM", name: "t", type: "stock" }).focus).toBe(
      "other-single-market",
    );
  });
});

describe("investment focus — portfolio math and non-regression", () => {
  const holdings = [
    { value: 9000, asset: etf("SPYL.DE") },
    { value: 500, asset: etf("MYSTERY.DE") },
    { value: 400, asset: { symbol: "AAPL", name: "Apple", type: "stock" as const } },
    { value: 100, asset: { symbol: "BTC", name: "Bitcoin", type: "crypto" as const } },
  ];

  it("focus rows sum to total, preserve unclassified and never rescale", () => {
    const s = calculatePortfolioInvestmentFocus(holdings);
    expect(s.totalValue).toBe(10000);
    expect(s.rows.reduce((a, r) => a + r.value, 0)).toBe(10000);
    expect(s.rows.find((r) => r.focus === "us")?.value).toBe(9400);
    expect(s.unclassifiedValue).toBe(500);
    expect(s.fundMandateValue).toBe(9000);
    expect(s.companyValue).toBe(400);
    expect(s.nonGeographicValue).toBe(100);
    expect(s.unclassifiedAssets).toEqual(["MYSTERY.DE"]);
  });

  it("geo summary separates withheld funds from unidentified instruments", () => {
    const g = calculatePortfolioGeographicExposure(holdings);
    expect(g.withheldFundValue).toBe(9000);
    expect(g.unresolvedValue).toBe(500);
    expect(g.residualUnknownValue).toBe(0);
    expect(g.unknownValue).toBe(9500);
    // Numeric country exposure is still never fabricated for the fund.
    expect(g.verifiedValue).toBe(400);
    expect(g.totalValue).toBe(10000);
  });

  it("every catalogued fund has exactly one focus fact and no percentage fields", () => {
    for (const entry of FUND_EXPOSURE_REGISTRY) {
      const fact = FUND_FOCUS_CATALOG[entry.canonicalId];
      expect(fact, entry.canonicalId).toBeDefined();
      expect(INVESTMENT_FOCUS_IDS).toContain(fact!.focus);
      expect(JSON.stringify(fact)).not.toMatch(/\d+(\.\d+)?\s?%/);
      expect(entry.countries).toBeUndefined();
      expect(entry.regions).toBeUndefined();
    }
    for (const id of Object.keys(FUND_FOCUS_CATALOG)) {
      expect(
        FUND_EXPOSURE_REGISTRY.some((e) => e.canonicalId === id),
        id,
      ).toBe(true);
    }
  });

  it("all five languages label every focus id", () => {
    for (const l of languages) {
      for (const id of INVESTMENT_FOCUS_IDS) {
        const label = FOCUS_LABELS[l.code][id];
        expect(label.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("investment focus — semantics and invariants", () => {
  it("80% US-focus ETF + 20% global ETF is a mandate split, not country exposure", () => {
    const holdings = [
      { value: 8000, asset: etf("SPYL.DE") },
      { value: 2000, asset: etf("VWCE.DE") },
    ];
    const f = calculatePortfolioInvestmentFocus(holdings);
    expect(f.rows.find((r) => r.focus === "us")?.share).toBeCloseTo(0.8, 10);
    expect(f.rows.find((r) => r.focus === "global-all-country")?.share).toBeCloseTo(0.2, 10);
    const g = calculatePortfolioGeographicExposure(holdings);
    // Region view never substitutes the mandate split for country weights.
    expect(g.rows.find((r) => r.region === "North America")).toBeUndefined();
    expect(g.rows.find((r) => r.region === "Unknown")?.share).toBe(1);
    expect(g.verifiedValue).toBe(0);
  });

  it("USD-denominated or US-listed-currency unknown instruments are not US focus", () => {
    const f = resolveInstrumentFocus({
      symbol: "UNKNOWN.US",
      name: "x",
      type: "stock",
      region: "North America",
      country: undefined,
    });
    expect(f.focus).toBe("unclassified");
    expect(resolveInstrumentFocus(etf("XYZ", { region: "North America" })).focus).toBe(
      "unclassified",
    );
  });

  it("same ISIN on different exchanges resolves to the same fund and focus", () => {
    const a = resolveInstrumentFocus(etf("EUNL.DE", { isin: "IE00B4L5Y983" }));
    const b = resolveInstrumentFocus(etf("IWDA.AS", { isin: "IE00B4L5Y983" }));
    const c = resolveInstrumentFocus(etf("SWDA.L", { isin: "IE00B4L5Y983" }));
    expect(a.canonicalId).toBe(b.canonicalId);
    expect(b.canonicalId).toBe(c.canonicalId);
    expect(a.focus).toBe("global-developed");
    // Same ISIN beats a misleading ticker.
    expect(resolveInstrumentFocus(etf("SPYL.DE", { isin: "IE00B4L5Y983" })).focus).toBe(
      "global-developed",
    );
  });

  it("bond fund keeps its mandate scope but cash/crypto stay non-geographic", () => {
    expect(resolveInstrumentFocus({ symbol: "BND", name: "b", type: "etf" }).focus).toBe("us");
    expect(resolveInstrumentFocus({ symbol: "EUR", name: "c", type: "cash" }).focus).toBe(
      "non-geographic",
    );
  });

  it("computing focus and region never mutates holdings or valuations", () => {
    const holdings = [
      { value: 8000, asset: etf("SPYL.DE", { region: "Europe" }), pnl: 12, costBasis: 7000 },
      { value: 2000, asset: etf("MYSTERY"), pnl: -3, costBasis: 2100 },
    ];
    const before = JSON.stringify(holdings);
    calculatePortfolioInvestmentFocus(holdings);
    calculatePortfolioGeographicExposure(holdings);
    expect(JSON.stringify(holdings)).toBe(before);
  });

  it("geoDisplayRows splits Unknown by reason and keeps the total intact", () => {
    const g = calculatePortfolioGeographicExposure([
      { value: 6000, asset: etf("VWCE.DE") },
      { value: 1000, asset: etf("MYSTERY") },
      { value: 3000, asset: { symbol: "AAPL", name: "Apple", type: "stock" as const } },
    ]);
    const rows = geoDisplayRows(g, "en");
    expect(rows.reduce((a, r) => a + r.value, 0)).toBe(10000);
    expect(rows.find((r) => r.name === "Fund · no country split")?.value).toBe(6000);
    expect(rows.find((r) => r.name === "Unidentified")?.value).toBe(1000);
    expect(rows.find((r) => r.name === "North America")?.value).toBe(3000);
  });

  it("analytics route constrains mobile grids to grid-cols-1 with min-w-0 and avoids orphaned sm:col-span-2", () => {
    const src = readFileSync(resolve(process.cwd(), "src/routes/analytics.tsx"), "utf8");
    expect(src).toContain('className="grid grid-cols-1 gap-5 lg:grid-cols-3"');
    expect(src).toContain('className="grid grid-cols-1 gap-4 md:grid-cols-2"');
    expect(src).toContain('className="min-w-0 lg:col-span-3"');
    expect(src).not.toContain('className="sm:col-span-2 lg:col-span-3');
  });
});
