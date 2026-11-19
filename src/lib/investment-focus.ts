import {
  countryToGeoRegion,
  normalizeCountryToIso,
  REPORTED_EQUITY_HQ_COUNTRIES,
  resolveFundExposureEntry,
  type FundExposureEntry,
  type GeoAssetInput,
} from "./geographic-exposure";
import type { PortfolioGeographicSummary } from "./geographic-exposure";
import type { Lang } from "./i18n";

/**
 * Investment focus = the market scope a fund states in its own name and benchmark.
 *
 * It is NOT look-through country exposure and carries no percentages. It is derived only from
 * public instrument facts (fund name, ISIN, stated benchmark scope) — never from third-party
 * holdings/country-weight tables, currency, exchange suffix or legal domicile.
 */
export const INVESTMENT_FOCUS_IDS = [
  "us",
  "europe",
  "global-all-country",
  "global-developed",
  "developed-ex-us",
  "emerging",
  "other-single-market",
  "non-geographic",
  "unclassified",
] as const;

export type InvestmentFocusId = (typeof INVESTMENT_FOCUS_IDS)[number];

export type FocusBasis = "fund-mandate" | "company-hq" | "non-geographic" | "none";

export interface FundFocusFact {
  focus: Exclude<InvestmentFocusId, "other-single-market" | "non-geographic" | "unclassified">;
  /** Stated benchmark scope, quoted as a public fact about the product (not a data table). */
  benchmark: string;
  /** Short human-readable rule explaining why the focus was assigned. */
  rule: string;
  /** True when the benchmark is defined by listing venue and may hold some non-US issuers. */
  foreignIssuersPossible?: boolean;
  /** Date the identifiers and benchmark scope were last checked against public product pages. */
  verifiedOn: string;
  verification: "web-checked" | "catalog-only";
}

/**
 * Deterministic primary-focus rule: one focus per fund, chosen from the geographic scope of the
 * fund's stated benchmark. Keyed by canonicalId of FUND_EXPOSURE_REGISTRY. No percentages.
 */
export const FUND_FOCUS_CATALOG: Readonly<Record<string, FundFocusFact>> = {
  "ishares-core-msci-world": {
    focus: "global-developed",
    benchmark: "MSCI World Index",
    rule: "Developed-market global equity benchmark (no emerging markets).",
    verifiedOn: "2026-11-19",
    verification: "web-checked",
  },
  "ishares-core-msci-em-imi": {
    focus: "emerging",
    benchmark: "MSCI Emerging Markets IMI Index",
    rule: "Emerging-market equity benchmark (large, mid and small caps).",
    verifiedOn: "2026-11-19",
    verification: "web-checked",
  },
  "ishares-msci-acwi": {
    focus: "global-all-country",
    benchmark: "MSCI ACWI Index",
    rule: "All-country benchmark spanning developed and emerging markets.",
    verifiedOn: "2026-11-19",
    verification: "catalog-only",
  },
  "vanguard-ftse-all-world": {
    focus: "global-all-country",
    benchmark: "FTSE All-World Index",
    rule: "All-country benchmark of large and mid caps across developed and emerging markets.",
    verifiedOn: "2026-11-19",
    verification: "web-checked",
  },
  "vanguard-ftse-all-world-hdy": {
    focus: "global-all-country",
    benchmark: "FTSE All-World High Dividend Yield Index",
    rule: "All-country benchmark (high-dividend subset); scope is global, weights differ from the parent index.",
    verifiedOn: "2026-11-19",
    verification: "catalog-only",
  },
  "spdr-sp500-ucits": {
    focus: "us",
    benchmark: "S&P 500 Index",
    rule: "US large-cap equity benchmark.",
    verifiedOn: "2026-11-19",
    verification: "web-checked",
  },
  "ishares-core-sp500-ucits": {
    focus: "us",
    benchmark: "S&P 500 Index",
    rule: "US large-cap equity benchmark.",
    verifiedOn: "2026-11-19",
    verification: "web-checked",
  },
  "vanguard-sp500-ucits": {
    focus: "us",
    benchmark: "S&P 500 Index",
    rule: "US large-cap equity benchmark.",
    verifiedOn: "2026-11-19",
    verification: "web-checked",
  },
  "us-sp500-etfs": {
    focus: "us",
    benchmark: "S&P 500 Index",
    rule: "US large-cap equity benchmark.",
    verifiedOn: "2026-11-19",
    verification: "catalog-only",
  },
  "vanguard-total-stock-us": {
    focus: "us",
    benchmark: "CRSP US Total Market Index",
    rule: "US total-market equity benchmark.",
    verifiedOn: "2026-11-19",
    verification: "catalog-only",
  },
  "spdr-msci-usa-scv": {
    focus: "us",
    benchmark: "MSCI USA Small Cap Value Weighted Index",
    rule: "US small-cap value equity benchmark.",
    verifiedOn: "2026-11-19",
    verification: "catalog-only",
  },
  "vanguard-total-bond-us": {
    focus: "us",
    benchmark: "Bloomberg U.S. Aggregate Float Adjusted Index",
    rule: "US investment-grade bond market benchmark (fixed income, not equities).",
    verifiedOn: "2026-11-19",
    verification: "catalog-only",
  },
  "stoxx-europe-600-ishares-de": {
    focus: "europe",
    benchmark: "STOXX Europe 600 Index",
    rule: "European equity benchmark (includes non-euro European markets such as the UK and Switzerland).",
    verifiedOn: "2026-11-19",
    verification: "web-checked",
  },
  "stoxx-europe-600-amundi-lu": {
    focus: "europe",
    benchmark: "STOXX Europe 600 Index",
    rule: "European equity benchmark.",
    verifiedOn: "2026-11-19",
    verification: "catalog-only",
  },
  "xtrackers-msci-world": {
    focus: "global-developed",
    benchmark: "MSCI World Index",
    rule: "Developed-market global equity benchmark (no emerging markets).",
    verifiedOn: "2026-11-19",
    verification: "catalog-only",
  },
  "ishares-msci-world-ex-usa": {
    focus: "developed-ex-us",
    benchmark: "MSCI World ex USA Index",
    rule: "Developed-market equity benchmark that excludes the United States (not only Europe).",
    verifiedOn: "2026-11-19",
    verification: "web-checked",
  },
  "nasdaq100-ucits": {
    focus: "us",
    benchmark: "Nasdaq-100 Index",
    rule: "100 largest non-financial companies listed on Nasdaq.",
    foreignIssuersPossible: true,
    verifiedOn: "2026-11-19",
    verification: "web-checked",
  },
  "xtrackers-nasdaq100": {
    focus: "us",
    benchmark: "Nasdaq-100 Index",
    rule: "100 largest non-financial companies listed on Nasdaq.",
    foreignIssuersPossible: true,
    verifiedOn: "2026-11-19",
    verification: "web-checked",
  },
  "qqq-nasdaq100": {
    focus: "us",
    benchmark: "Nasdaq-100 Index",
    rule: "100 largest non-financial companies listed on Nasdaq.",
    foreignIssuersPossible: true,
    verifiedOn: "2026-11-19",
    verification: "catalog-only",
  },
};

export interface ResolvedInstrumentFocus {
  kind: FocusBasis;
  focus: InvestmentFocusId;
  symbol: string;
  canonicalId: string | null;
  fundName: string | null;
  benchmark: string | null;
  rule: string;
  foreignIssuersPossible: boolean;
  verifiedOn: string | null;
  verification: FundFocusFact["verification"] | null;
}

export type FocusAssetInput = GeoAssetInput;

export function resolveInstrumentFocus(
  asset: FocusAssetInput,
  options?: {
    registry?: readonly FundExposureEntry[];
    focusCatalog?: Readonly<Record<string, FundFocusFact>>;
    equityCountries?: Readonly<Record<string, string>>;
  },
): ResolvedInstrumentFocus {
  const upper = asset.symbol.trim().toUpperCase();
  const catalog = options?.focusCatalog ?? FUND_FOCUS_CATALOG;
  const equityCountries = options?.equityCountries ?? REPORTED_EQUITY_HQ_COUNTRIES;

  if (asset.type === "crypto" || asset.type === "cash") {
    return {
      kind: "non-geographic",
      focus: "non-geographic",
      symbol: upper,
      canonicalId: null,
      fundName: null,
      benchmark: null,
      rule: "Cash and crypto have no market-geography mandate.",
      foreignIssuersPossible: false,
      verifiedOn: null,
      verification: null,
    };
  }

  const fund = resolveFundExposureEntry({ symbol: upper, isin: asset.isin }, options?.registry);
  if (fund) {
    const fact = catalog[fund.canonicalId];
    if (fact) {
      return {
        kind: "fund-mandate",
        focus: fact.focus,
        symbol: upper,
        canonicalId: fund.canonicalId,
        fundName: fund.name,
        benchmark: fact.benchmark,
        rule: fact.rule,
        foreignIssuersPossible: Boolean(fact.foreignIssuersPossible),
        verifiedOn: fact.verifiedOn,
        verification: fact.verification,
      };
    }
  }

  const iso =
    normalizeCountryToIso(asset.country) ??
    (asset.type === "stock" && !fund ? normalizeCountryToIso(equityCountries[upper]) : null);
  if (iso && iso !== "OTHR" && iso !== "CASHD_C") {
    const region = countryToGeoRegion(iso);
    const focus: InvestmentFocusId =
      iso === "US" ? "us" : region === "Europe" ? "europe" : "other-single-market";
    return {
      kind: "company-hq",
      focus,
      symbol: upper,
      canonicalId: `equity:${upper}`,
      fundName: null,
      benchmark: null,
      rule: "Single company classified by its reported headquarters country (not revenue exposure).",
      foreignIssuersPossible: false,
      verifiedOn: null,
      verification: null,
    };
  }

  return {
    kind: "none",
    focus: "unclassified",
    symbol: upper,
    canonicalId: null,
    fundName: fund?.name ?? null,
    benchmark: null,
    rule: "Instrument identity or mandate is not in the verified catalog.",
    foreignIssuersPossible: false,
    verifiedOn: null,
    verification: null,
  };
}

export interface PortfolioFocusRow {
  focus: InvestmentFocusId;
  value: number;
  share: number;
}

export interface PortfolioFocusSummary {
  rows: PortfolioFocusRow[];
  totalValue: number;
  /** Value held in funds whose focus comes from a verified mandate (no look-through weights). */
  fundMandateValue: number;
  companyValue: number;
  nonGeographicValue: number;
  unclassifiedValue: number;
  unclassifiedAssets: string[];
  foreignIssuersPossibleAssets: string[];
  details: Array<{ symbol: string; name: string; value: number; focus: ResolvedInstrumentFocus }>;
}

export function calculatePortfolioInvestmentFocus(
  holdings: ReadonlyArray<{ value: number; asset: FocusAssetInput }>,
  options?: Parameters<typeof resolveInstrumentFocus>[1],
): PortfolioFocusSummary {
  const totals = new Map<InvestmentFocusId, number>();
  const unclassifiedAssets: string[] = [];
  const foreignIssuersPossibleAssets: string[] = [];
  const details: PortfolioFocusSummary["details"] = [];
  let totalValue = 0;
  let fundMandateValue = 0;
  let companyValue = 0;
  let nonGeographicValue = 0;
  let unclassifiedValue = 0;

  for (const h of holdings) {
    if (!Number.isFinite(h.value) || h.value <= 0) continue;
    totalValue += h.value;
    const focus = resolveInstrumentFocus(h.asset, options);
    details.push({ symbol: h.asset.symbol, name: h.asset.name, value: h.value, focus });
    totals.set(focus.focus, (totals.get(focus.focus) ?? 0) + h.value);
    if (focus.kind === "fund-mandate") fundMandateValue += h.value;
    else if (focus.kind === "company-hq") companyValue += h.value;
    else if (focus.kind === "non-geographic") nonGeographicValue += h.value;
    else {
      unclassifiedValue += h.value;
      if (!unclassifiedAssets.includes(h.asset.symbol)) unclassifiedAssets.push(h.asset.symbol);
    }
    if (focus.foreignIssuersPossible && !foreignIssuersPossibleAssets.includes(h.asset.symbol)) {
      foreignIssuersPossibleAssets.push(h.asset.symbol);
    }
  }

  const order = new Map(INVESTMENT_FOCUS_IDS.map((id, i) => [id, i] as const));
  const rows = [...totals.entries()]
    .map(([focus, value]) => ({ focus, value, share: totalValue > 0 ? value / totalValue : 0 }))
    .sort((a, b) => b.value - a.value || order.get(a.focus)! - order.get(b.focus)!);

  return {
    rows,
    totalValue,
    fundMandateValue,
    companyValue,
    nonGeographicValue,
    unclassifiedValue,
    unclassifiedAssets,
    foreignIssuersPossibleAssets,
    details,
  };
}

export const FOCUS_LABELS: Record<Lang, Record<InvestmentFocusId, string>> = {
  en: {
    us: "United States",
    europe: "Europe",
    "global-all-country": "Global (all countries)",
    "global-developed": "Global developed",
    "developed-ex-us": "Developed ex-US",
    emerging: "Emerging markets",
    "other-single-market": "Other single markets",
    "non-geographic": "Non-geographic",
    unclassified: "Unclassified",
  },
  bg: {
    us: "САЩ",
    europe: "Европа",
    "global-all-country": "Глобален (всички страни)",
    "global-developed": "Глобален развит",
    "developed-ex-us": "Развити без САЩ",
    emerging: "Развиващи се пазари",
    "other-single-market": "Други отделни пазари",
    "non-geographic": "Негеографски",
    unclassified: "Некласифицирани",
  },
  de: {
    us: "USA",
    europe: "Europa",
    "global-all-country": "Global (alle Länder)",
    "global-developed": "Global Industrieländer",
    "developed-ex-us": "Industrieländer ex USA",
    emerging: "Schwellenländer",
    "other-single-market": "Sonstige Einzelmärkte",
    "non-geographic": "Nicht-geografisch",
    unclassified: "Nicht klassifiziert",
  },
  es: {
    us: "Estados Unidos",
    europe: "Europa",
    "global-all-country": "Global (todos los países)",
    "global-developed": "Global desarrollado",
    "developed-ex-us": "Desarrollados ex EE. UU.",
    emerging: "Mercados emergentes",
    "other-single-market": "Otros mercados individuales",
    "non-geographic": "No geográfico",
    unclassified: "Sin clasificar",
  },
  it: {
    us: "Stati Uniti",
    europe: "Europa",
    "global-all-country": "Globale (tutti i paesi)",
    "global-developed": "Globale sviluppati",
    "developed-ex-us": "Sviluppati ex USA",
    emerging: "Mercati emergenti",
    "other-single-market": "Altri mercati singoli",
    "non-geographic": "Non geografico",
    unclassified: "Non classificato",
  },
};

/** Labels that split the engine's single "Unknown" bucket into distinct, honest reasons. */
export const GEO_UNKNOWN_SPLIT_LABELS: Record<
  Lang,
  { withheld: string; unresolved: string; residual: string }
> = {
  en: {
    withheld: "Fund · no country split",
    unresolved: "Unidentified",
    residual: "Unallocated",
  },
  bg: {
    withheld: "Фонд · без разбивка по държави",
    unresolved: "Неидентифицирани",
    residual: "Неразпределени",
  },
  de: {
    withheld: "Fonds · ohne Länderaufteilung",
    unresolved: "Nicht identifiziert",
    residual: "Nicht zugeordnet",
  },
  es: {
    withheld: "Fondo · sin desglose por país",
    unresolved: "No identificado",
    residual: "Sin asignar",
  },
  it: {
    withheld: "Fondo · senza ripartizione paesi",
    unresolved: "Non identificato",
    residual: "Non allocato",
  },
};

/**
 * Display rows for the Region chart. The engine keeps one "Unknown" bucket; this splits it into
 * its reasons so a recognised fund without a displayable country split is never shown as an
 * unidentified instrument. Values still sum to the engine total; nothing is invented.
 */
export function geoDisplayRows(
  summary: PortfolioGeographicSummary,
  lang: Lang,
): { name: string; value: number }[] {
  const split = GEO_UNKNOWN_SPLIT_LABELS[lang];
  return summary.rows.flatMap((row) =>
    row.region === "Unknown"
      ? [
          { name: split.withheld, value: summary.withheldFundValue },
          { name: split.unresolved, value: summary.unresolvedValue },
          { name: split.residual, value: summary.residualUnknownValue },
        ].filter((r) => r.value > 0)
      : [{ name: row.name, value: row.value }],
  );
}

/** Row names drawn in neutral grey because the value is unavailable, not a real category. */
export function neutralAllocationNames(lang: Lang): string[] {
  const split = GEO_UNKNOWN_SPLIT_LABELS[lang];
  return [split.withheld, split.unresolved, split.residual, FOCUS_LABELS[lang].unclassified];
}
