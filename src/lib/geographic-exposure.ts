import type { Asset, AssetType, Holding } from "./portfolio";
import { resolveImportedInstrument } from "./instrument-identity";

export const GEO_REGIONS = [
  "North America",
  "Latin America",
  "Europe",
  "Asia-Pacific",
  "Middle East",
  "Africa",
  "Non-Geographic",
  "Unknown",
] as const;

export type GeoRegion = (typeof GEO_REGIONS)[number];

export type GeoDataQuality =
  | "issuer-reported"
  | "verified-single-region"
  | "benchmark-approximation"
  | "provider-company-country"
  | "non-geographic"
  | "license-restricted"
  | "unavailable";

export type GeoLicenseStatus =
  "cleared" | "restricted-website-terms" | "unclear-index-mandate" | "unclear-provider-tos";

export interface FundExposureEntry {
  canonicalId: string;
  name: string;
  issuer: string;
  indexName: string;
  domicile?: "IE" | "LU" | "DE" | "US";
  assetType?: AssetType;
  isins: readonly string[];
  listings: readonly string[];
  /** Unambiguous bare ticker aliases (never blindly stripped for arbitrary securities). */
  aliases?: readonly string[];
  /** Country weights supplied ONLY when a cleared, authorized dataset is injected (zero third-party weights embedded here). */
  countries?: Readonly<Record<string, number>>;
  /** Explicit regional weights supplied ONLY when cleared and authorized. */
  regions?: Readonly<Partial<Record<GeoRegion, number>>>;
  source: string;
  sourceUrl: string;
  methodology: string;
  asOfDate: string;
  dataQuality: Exclude<
    GeoDataQuality,
    "provider-company-country" | "non-geographic" | "unavailable"
  >;
  isBenchmarkProxy: boolean;
  staleAfterDays?: number;
  licenseStatus: GeoLicenseStatus;
  redistributionCleared: boolean;
}

export interface ResolvedGeoProfile {
  kind: "fund" | "equity" | "non-geographic" | "unavailable";
  canonicalId: string;
  symbol: string;
  isin: string | null;
  countryCode: string | null;
  countries: Readonly<Record<string, number>> | null;
  regions: Readonly<Partial<Record<GeoRegion, number>>>;
  source: string;
  sourceUrl: string | null;
  methodology: string;
  asOfDate: string | null;
  dataQuality: GeoDataQuality;
  licenseStatus: GeoLicenseStatus;
  redistributionCleared: boolean;
  isBenchmarkProxy: boolean;
  stale: boolean;
}

/** ISO 3166-1 alpha-2 country-to-region map (mutually exclusive geographic regions; never mixes Emerging Markets). */
export const COUNTRY_TO_REGION: Readonly<Record<string, GeoRegion>> = {
  // North America
  US: "North America",
  CA: "North America",

  // Latin America (Mexico grouped per institutional regional allocation convention)
  BR: "Latin America",
  MX: "Latin America",
  CL: "Latin America",
  CO: "Latin America",
  PE: "Latin America",
  AR: "Latin America",
  PA: "Latin America",
  UY: "Latin America",

  // Europe (geographic continent, independent of EU membership)
  GB: "Europe",
  CH: "Europe",
  DE: "Europe",
  FR: "Europe",
  NL: "Europe",
  IE: "Europe",
  SE: "Europe",
  DK: "Europe",
  IT: "Europe",
  ES: "Europe",
  FI: "Europe",
  BE: "Europe",
  NO: "Europe",
  AT: "Europe",
  PT: "Europe",
  LU: "Europe",
  PL: "Europe",
  GR: "Europe",
  CZ: "Europe",
  HU: "Europe",
  RO: "Europe",
  BG: "Europe",
  IS: "Europe",

  // Asia-Pacific (includes both Developed APAC and Asian EM countries)
  JP: "Asia-Pacific",
  AU: "Asia-Pacific",
  NZ: "Asia-Pacific",
  HK: "Asia-Pacific",
  SG: "Asia-Pacific",
  TW: "Asia-Pacific",
  CN: "Asia-Pacific",
  KR: "Asia-Pacific",
  IN: "Asia-Pacific",
  ID: "Asia-Pacific",
  TH: "Asia-Pacific",
  MY: "Asia-Pacific",
  PH: "Asia-Pacific",
  VN: "Asia-Pacific",
  PK: "Asia-Pacific",

  // Middle East
  IL: "Middle East",
  SA: "Middle East",
  AE: "Middle East",
  QA: "Middle East",
  KW: "Middle East",
  BH: "Middle East",
  OM: "Middle East",
  JO: "Middle East",
  TR: "Middle East",

  // Africa
  ZA: "Africa",
  EG: "Africa",
  MA: "Africa",
  NG: "Africa",
  KE: "Africa",
  MU: "Africa",
};

const COUNTRY_NAME_TO_ISO: Readonly<Record<string, string>> = {
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  canada: "CA",
  brazil: "BR",
  mexico: "MX",
  chile: "CL",
  colombia: "CO",
  peru: "PE",
  argentina: "AR",
  panama: "PA",
  uruguay: "UY",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  switzerland: "CH",
  germany: "DE",
  france: "FR",
  netherlands: "NL",
  "the netherlands": "NL",
  ireland: "IE",
  sweden: "SE",
  denmark: "DK",
  italy: "IT",
  spain: "ES",
  finland: "FI",
  belgium: "BE",
  norway: "NO",
  austria: "AT",
  portugal: "PT",
  luxembourg: "LU",
  poland: "PL",
  greece: "GR",
  "czech republic": "CZ",
  czechia: "CZ",
  hungary: "HU",
  romania: "RO",
  bulgaria: "BG",
  iceland: "IS",
  japan: "JP",
  australia: "AU",
  "new zealand": "NZ",
  "hong kong": "HK",
  "hong kong sar": "HK",
  singapore: "SG",
  taiwan: "TW",
  china: "CN",
  "china mainland": "CN",
  "south korea": "KR",
  korea: "KR",
  "korea (south)": "KR",
  "republic of korea": "KR",
  india: "IN",
  indonesia: "ID",
  thailand: "TH",
  malaysia: "MY",
  philippines: "PH",
  vietnam: "VN",
  pakistan: "PK",
  israel: "IL",
  "saudi arabia": "SA",
  "united arab emirates": "AE",
  uae: "AE",
  qatar: "QA",
  kuwait: "KW",
  bahrain: "BH",
  oman: "OM",
  jordan: "JO",
  turkey: "TR",
  türkiye: "TR",
  "south africa": "ZA",
  egypt: "EG",
  morocco: "MA",
  nigeria: "NG",
  kenya: "KE",
  mauritius: "MU",
  cash: "CASHD_C",
  derivatives: "CASHD_C",
  cash_and_derivatives: "CASHD_C",
  cashd_c: "CASHD_C",
  other: "OTHR",
  othr: "OTHR",
};

/** Normalize an ISO code or provider country name to canonical ISO alpha-2 (or OTHR / CASHD_C), returning null if unrecognized. */
export function normalizeCountryToIso(countryOrIso: string | null | undefined): string | null {
  if (!countryOrIso) return null;
  const trimmed = countryOrIso.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper === "OTHR" || upper === "CASHD_C") return upper;
  if (upper === "UK") return "GB";
  if (upper.length === 2 && COUNTRY_TO_REGION[upper]) return upper;
  return COUNTRY_NAME_TO_ISO[trimmed.toLowerCase()] ?? null;
}

/** Map a country name or ISO code to a single mutually exclusive geographic region. */
export function countryToGeoRegion(countryOrIso: string | null | undefined): GeoRegion {
  const iso = normalizeCountryToIso(countryOrIso);
  if (!iso) return "Unknown";
  if (iso === "CASHD_C") return "Non-Geographic";
  if (iso === "OTHR") return "Unknown";
  return COUNTRY_TO_REGION[iso] ?? "Unknown";
}

const WITHHELD_FUND_METHODOLOGY =
  "Fund identity is resolved cleanly by ISIN and listing, while third-party constituent country weights are excluded because commercial distribution rights are not included. Currency and legal domicile are never used as substitutes.";

/**
 * Identity catalog for major UCITS and US ETFs.
 * Contains strictly public instrument identifiers (ISINs, listings, aliases, issuer names, license status) —
 * zero embedded third-party percentage tables are distributed in source or build output.
 */
export const FUND_EXPOSURE_REGISTRY: readonly FundExposureEntry[] = [
  {
    canonicalId: "ishares-core-msci-world",
    name: "iShares Core MSCI World UCITS ETF",
    issuer: "BlackRock / iShares",
    indexName: "MSCI World Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE00B4L5Y983"],
    listings: ["IWDA.AS", "EUNL.DE", "SWDA.L"],
    aliases: ["IWDA", "EUNL", "SWDA"],
    source: "BlackRock iShares (Catalog identity)",
    sourceUrl:
      "https://www.ishares.com/uk/individual/en/products/251882/ishares-core-msci-world-ucits-etf-fund",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-17",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "restricted-website-terms",
    redistributionCleared: false,
  },
  {
    canonicalId: "ishares-core-msci-em-imi",
    name: "iShares Core MSCI EM IMI UCITS ETF",
    issuer: "BlackRock / iShares",
    indexName: "MSCI EM IMI",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE00BKM4GZ66"],
    listings: ["IS3N.DE", "EIMI.L"],
    aliases: ["IS3N", "EIMI"],
    source: "BlackRock iShares (Catalog identity)",
    sourceUrl:
      "https://www.ishares.com/uk/individual/en/products/264659/ishares-core-msci-emerging-markets-imi-ucits-etf",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-17",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "restricted-website-terms",
    redistributionCleared: false,
  },
  {
    canonicalId: "ishares-msci-acwi",
    name: "iShares MSCI ACWI UCITS ETF",
    issuer: "BlackRock / iShares",
    indexName: "MSCI ACWI Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE00B6R52259"],
    listings: ["IUSQ.DE", "SSAC.L"],
    aliases: ["IUSQ", "SSAC"],
    source: "BlackRock iShares (Catalog identity)",
    sourceUrl:
      "https://www.ishares.com/uk/individual/en/products/251850/ishares-msci-acwi-ucits-etf",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-17",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "restricted-website-terms",
    redistributionCleared: false,
  },
  {
    canonicalId: "vanguard-ftse-all-world",
    name: "Vanguard FTSE All-World UCITS ETF",
    issuer: "Vanguard",
    indexName: "FTSE All-World Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE00BK5BQT80", "IE00B3RBWM25"],
    listings: ["VWCE.DE", "VWRA.L", "VWRP.L", "VWRL.AS"],
    aliases: ["VWCE", "VWRA", "VWRP", "VWRL"],
    source: "Vanguard UK (Catalog identity)",
    sourceUrl:
      "https://www.vanguard.co.uk/professional/product/etf/equity/9679/ftse-all-world-ucits-etf-usd-accumulating",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-10-31",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "restricted-website-terms",
    redistributionCleared: false,
  },
  {
    canonicalId: "vanguard-ftse-all-world-hdy",
    name: "Vanguard FTSE All-World High Dividend Yield UCITS ETF",
    issuer: "Vanguard",
    indexName: "FTSE All-World High Dividend Yield Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE00B8GKDB10"],
    listings: ["VHYL.AS", "VHYD.L"],
    aliases: ["VHYL", "VHYD"],
    source: "Vanguard UK (Catalog identity)",
    sourceUrl:
      "https://www.vanguard.co.uk/professional/product/etf/equity/9506/ftse-all-world-high-dividend-yield-ucits-etf-usd-distributing",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-10-31",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "restricted-website-terms",
    redistributionCleared: false,
  },
  {
    canonicalId: "spdr-sp500-ucits",
    name: "SPDR S&P 500 UCITS ETF",
    issuer: "State Street SPDR",
    indexName: "S&P 500 Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE000XZSV718"],
    listings: ["SPYL.DE", "SPYL.AS"],
    aliases: ["SPYL"],
    source: "Index mandate (Catalog identity)",
    sourceUrl: "https://www.ssga.com/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "unclear-index-mandate",
    redistributionCleared: false,
  },
  {
    canonicalId: "ishares-core-sp500-ucits",
    name: "iShares Core S&P 500 UCITS ETF",
    issuer: "BlackRock / iShares",
    indexName: "S&P 500 Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE00B5BMR087"],
    listings: ["SXR8.DE", "CSPX.L"],
    aliases: ["SXR8", "CSPX"],
    source: "Index mandate (Catalog identity)",
    sourceUrl:
      "https://www.ishares.com/uk/individual/en/products/253743/ishares-core-sp-500-ucits-etf",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "unclear-index-mandate",
    redistributionCleared: false,
  },
  {
    canonicalId: "vanguard-sp500-ucits",
    name: "Vanguard S&P 500 UCITS ETF",
    issuer: "Vanguard",
    indexName: "S&P 500 Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE00BFMXXD54", "IE00B3XXRP09"],
    listings: ["VUAA.DE", "VUSA.AS"],
    aliases: ["VUAA", "VUSA"],
    source: "Index mandate (Catalog identity)",
    sourceUrl: "https://www.vanguard.co.uk/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "unclear-index-mandate",
    redistributionCleared: false,
  },
  {
    canonicalId: "us-sp500-etfs",
    name: "US-Listed S&P 500 ETFs (VOO / SPY / IVV)",
    issuer: "Vanguard / SSGA / BlackRock",
    indexName: "S&P 500 Index",
    domicile: "US",
    assetType: "etf",
    isins: ["US9229083632", "US78462F1030", "US4642872000"],
    listings: ["VOO", "SPY", "IVV"],
    source: "Index mandate (Catalog identity)",
    sourceUrl: "https://www.spglobal.com/spdji/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "unclear-index-mandate",
    redistributionCleared: false,
  },
  {
    canonicalId: "vanguard-total-stock-us",
    name: "Vanguard Total Stock Market ETF",
    issuer: "Vanguard",
    indexName: "CRSP US Total Market Index",
    domicile: "US",
    assetType: "etf",
    isins: ["US9229087690"],
    listings: ["VTI"],
    source: "Index mandate (Catalog identity)",
    sourceUrl: "https://investor.vanguard.com/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "unclear-index-mandate",
    redistributionCleared: false,
  },
  {
    canonicalId: "vanguard-ftse-all-world-ex-us-ucits",
    name: "Vanguard FTSE All-World ex-US UCITS ETF",
    issuer: "Vanguard",
    indexName: "FTSE All-World ex US Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE0009A5ADV9"],
    // Do NOT add bare "VXUS" as an unconditional alias: US VXUS (US9220427424) is a separate fund.
    listings: ["VXUS.DE", "VXUS.AS", "VXUS.L"],
    source: "Vanguard (Catalog identity)",
    sourceUrl: "https://www.vanguard.co.uk/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "restricted-website-terms",
    redistributionCleared: false,
  },
  {
    canonicalId: "vanguard-total-international-stock-us",
    name: "Vanguard Total International Stock ETF",
    issuer: "Vanguard",
    indexName: "FTSE Global All Cap ex US Index",
    domicile: "US",
    assetType: "etf",
    isins: ["US9220427424"],
    listings: ["VXUS"],
    source: "Vanguard (Catalog identity)",
    sourceUrl: "https://investor.vanguard.com/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "restricted-website-terms",
    redistributionCleared: false,
  },
  {
    canonicalId: "spdr-msci-usa-scv",
    name: "SPDR MSCI USA Small Cap Value Weighted UCITS ETF",
    issuer: "State Street SPDR",
    indexName: "MSCI USA Small Cap Value Weighted Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE00BSPLC413"],
    listings: ["ZPRV.DE"],
    aliases: ["ZPRV"],
    source: "Index mandate (Catalog identity)",
    sourceUrl: "https://www.ssga.com/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "unclear-index-mandate",
    redistributionCleared: false,
  },
  {
    canonicalId: "vanguard-total-bond-us",
    name: "Vanguard Total Bond Market ETF",
    issuer: "Vanguard",
    indexName: "Bloomberg U.S. Aggregate Float Adjusted Index",
    domicile: "US",
    assetType: "etf",
    isins: ["US9219378356"],
    listings: ["BND"],
    source: "Index mandate (Catalog identity)",
    sourceUrl: "https://investor.vanguard.com/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "unclear-index-mandate",
    redistributionCleared: false,
  },
  {
    canonicalId: "stoxx-europe-600-ishares-de",
    name: "iShares STOXX Europe 600 UCITS ETF (DE)",
    issuer: "BlackRock / iShares",
    indexName: "STOXX Europe 600 Index",
    domicile: "DE",
    assetType: "etf",
    isins: ["DE0002635307"],
    listings: ["EXSA.DE"],
    aliases: ["EXSA"],
    source: "Index mandate (Catalog identity)",
    sourceUrl: "https://www.stoxx.com/index/sxxp/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "unclear-index-mandate",
    redistributionCleared: false,
  },
  {
    canonicalId: "stoxx-europe-600-amundi-lu",
    name: "Amundi Core STOXX Europe 600 UCITS ETF",
    issuer: "Amundi",
    indexName: "STOXX Europe 600 Index",
    domicile: "LU",
    assetType: "etf",
    isins: ["LU0908500753"],
    listings: ["MEUD.PA"],
    aliases: ["MEUD"],
    source: "Index mandate (Catalog identity)",
    sourceUrl: "https://www.stoxx.com/index/sxxp/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "unclear-index-mandate",
    redistributionCleared: false,
  },
  {
    canonicalId: "xtrackers-msci-world",
    name: "Xtrackers MSCI World UCITS ETF 1C",
    issuer: "Xtrackers / DWS",
    indexName: "MSCI World Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE00BJ0KDQ92"],
    listings: ["XDWD.DE"],
    aliases: ["XDWD"],
    source: "Xtrackers / MSCI (Catalog identity)",
    sourceUrl: "https://www.msci.com/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-10-30",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "restricted-website-terms",
    redistributionCleared: false,
  },
  {
    canonicalId: "ishares-msci-world-ex-usa",
    name: "iShares MSCI World ex-USA UCITS ETF",
    issuer: "BlackRock / iShares",
    indexName: "MSCI World ex USA Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE000R4ZNTN3"],
    listings: ["IXUA.DE", "XUSE.L"],
    aliases: ["IXUA", "XUSE"],
    source: "BlackRock / MSCI (Catalog identity)",
    sourceUrl: "https://www.msci.com/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-10-30",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "restricted-website-terms",
    redistributionCleared: false,
  },
  {
    canonicalId: "nasdaq100-ucits",
    name: "Nasdaq-100 UCITS ETFs (SXRV / CNDX Acc, EQQQ Dist)",
    issuer: "BlackRock iShares / Invesco",
    indexName: "Nasdaq-100 Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE00B53SZB19", "IE0032077012"],
    listings: ["SXRV.DE", "CNDX.L", "EQQQ.DE"],
    aliases: ["SXRV", "CNDX", "EQQQ"],
    source: "Invesco / BlackRock (Catalog identity)",
    sourceUrl: "https://www.invesco.com/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "restricted-website-terms",
    redistributionCleared: false,
  },
  {
    canonicalId: "xtrackers-nasdaq100",
    name: "Xtrackers Nasdaq 100 UCITS ETF 1C",
    issuer: "Xtrackers / DWS",
    indexName: "Nasdaq-100 Index",
    domicile: "IE",
    assetType: "etf",
    isins: ["IE00BMFKG444"],
    listings: ["XNAS.DE"],
    aliases: ["XNAS"],
    source: "Xtrackers (Catalog identity)",
    sourceUrl: "https://etf.dws.com/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "unclear-index-mandate",
    redistributionCleared: false,
  },
  {
    canonicalId: "qqq-nasdaq100",
    name: "Invesco QQQ Trust (Nasdaq-100)",
    issuer: "Invesco",
    indexName: "Nasdaq-100 Index",
    domicile: "US",
    assetType: "etf",
    isins: ["US46090E1038"],
    listings: ["QQQ"],
    source: "Invesco (Catalog identity)",
    sourceUrl: "https://www.invesco.com/",
    methodology: WITHHELD_FUND_METHODOLOGY,
    asOfDate: "2026-11-19",
    dataQuality: "license-restricted",
    isBenchmarkProxy: false,
    licenseStatus: "restricted-website-terms",
    redistributionCleared: false,
  },
];

/**
 * Allocates exactly 1,000 tenths of a percent (100.0%) across positive values via Hamilton's
 * largest-remainder method so displayed 1-decimal percentages sum cleanly to 100.0%.
 */
export function distributeShareTenths(values: readonly number[]): number[] {
  const safe = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const total = safe.reduce((acc, v) => acc + v, 0);
  if (total <= 0) return safe.map(() => 0);

  const exact = safe.map((v) => (v / total) * 1000);
  const floors = exact.map((e) => Math.floor(e));
  const remainder = 1000 - floors.reduce((acc, f) => acc + f, 0);

  const order = exact
    .map((e, index) => ({ index, frac: e - floors[index]!, value: safe[index]! }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.frac - a.frac || b.value - a.value || a.index - b.index);

  for (let i = 0; i < remainder && order.length > 0; i++) {
    floors[order[i % order.length]!.index]! += 1;
  }
  return floors;
}

/** Public corporate headquarters jurisdictions from statutory filings (explicitly HQ location, not revenue exposure). */
export const REPORTED_EQUITY_HQ_COUNTRIES: Readonly<Record<string, string>> = {
  AAPL: "US",
  MSFT: "US",
  GOOGL: "US",
  GOOG: "US",
  AMZN: "US",
  NVDA: "US",
  META: "US",
  TSLA: "US",
  "BRK-B": "US",
  JPM: "US",
  LLY: "US",
  AVGO: "US",
  WMT: "US",
  ORCL: "US",
  COST: "US",
  KO: "US",
  UBER: "US",
  NFLX: "US",
  ASML: "NL",
  "ASML.AS": "NL",
  SAP: "DE",
  "SAP.DE": "DE",
  "SIE.DE": "DE",
  "ALV.DE": "DE",
  "MC.PA": "FR",
  "AIR.PA": "FR",
  "NESN.SW": "CH",
  "NOVN.SW": "CH",
  "NOVO-B.CO": "DK",
  "SHEL.L": "GB",
  "AZN.L": "GB",
  TSM: "TW",
  "2330.TW": "TW",
  TM: "JP",
  "7203.T": "JP",
  BABA: "CN",
};

/** Normalize country weights into mutually exclusive geographic regions while preserving Unknown and Non-Geographic residuals. */
export function aggregateCountriesToRegions(
  countries: Readonly<Record<string, number>>,
): Partial<Record<GeoRegion, number>> {
  const raw = new Map<GeoRegion, number>();
  let total = 0;

  for (const [country, weight] of Object.entries(countries)) {
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) continue;
    const region = countryToGeoRegion(country);
    raw.set(region, (raw.get(region) ?? 0) + weight);
    total += weight;
  }

  if (total <= 0) return { Unknown: 1 };

  const out: Partial<Record<GeoRegion, number>> = {};
  for (const region of GEO_REGIONS) {
    const val = raw.get(region);
    if (val && val > 0) out[region] = val / total;
  }
  return out;
}

export function isGeoProfileStale(
  asOfDate: string | null | undefined,
  staleAfterDays = 90,
  now = Date.now(),
): boolean {
  if (!asOfDate) return false;
  const parsed = Date.parse(`${asOfDate}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return false;
  return now - parsed > staleAfterDays * 86_400_000;
}

const VALID_ISIN_REGEX = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

export function resolveFundExposureEntry(
  input: {
    symbol?: string | null | undefined;
    isin?: string | null | undefined;
    name?: string | null | undefined;
  },
  registry: readonly FundExposureEntry[] = FUND_EXPOSURE_REGISTRY,
): FundExposureEntry | null {
  const normIsin = input.isin?.trim().toUpperCase() || "";
  if (normIsin) {
    const byIsin = registry.find((entry) =>
      entry.isins.some((code) => code.toUpperCase() === normIsin),
    );
    if (byIsin) return byIsin;
    // Do not guess another share class or fund by ticker when a valid ISIN explicitly disagrees.
    if (VALID_ISIN_REGEX.test(normIsin)) return null;
  }

  const normSymbol = input.symbol?.trim().toUpperCase() || "";
  if (!normSymbol) return null;

  // Disambiguate colliding bare tickers (e.g. VXUS UCITS vs VXUS US, EQQQ UCITS vs EQQQ US) before registry fallback.
  if (registry === FUND_EXPOSURE_REGISTRY) {
    const resolved = resolveImportedInstrument({
      symbol: normSymbol,
      isin: normIsin || undefined,
      name: input.name,
    });
    if (resolved.canonicalId) {
      const byCanonical = registry.find((entry) => entry.canonicalId === resolved.canonicalId);
      if (byCanonical) return byCanonical;
    }
    if (resolved.isin) {
      const byResolvedIsin = registry.find((entry) =>
        entry.isins.some((code) => code.toUpperCase() === resolved.isin),
      );
      if (byResolvedIsin) return byResolvedIsin;
    }
  }

  const byListing = registry.find((entry) =>
    entry.listings.some((ticker) => ticker.toUpperCase() === normSymbol),
  );
  if (byListing) return byListing;

  const byAlias = registry.find((entry) =>
    entry.aliases?.some((alias) => alias.toUpperCase() === normSymbol),
  );
  return byAlias ?? null;
}

function normalizeRegionsMap(
  regions: Readonly<Partial<Record<GeoRegion, number>>>,
): Partial<Record<GeoRegion, number>> {
  const entries = Object.entries(regions).filter(
    ([, weight]) => typeof weight === "number" && Number.isFinite(weight) && weight > 0,
  ) as [GeoRegion, number][];
  const sum = entries.reduce((acc, [, weight]) => acc + weight, 0);
  if (sum <= 0) return { Unknown: 1 };
  const out: Partial<Record<GeoRegion, number>> = {};
  for (const [region, weight] of entries) {
    out[region] = (out[region] ?? 0) + weight / sum;
  }
  return out;
}

export type GeoAssetInput = Pick<Asset, "symbol" | "name" | "type"> & {
  isin?: string | null | undefined;
  country?: string | null | undefined;
  region?: string | null | undefined;
};

/**
 * Resolves an asset's geographic exposure cleanly using only cleared/authorized datasets,
 * factual corporate HQ jurisdictions (explicitly labeled as HQ location), and Non-Geographic native classes.
 * Never infers geographic exposure from trading currency, exchange suffix, or legal fund domicile.
 */
export function resolveInstrumentGeoProfile(
  asset: GeoAssetInput,
  options?: {
    registry?: readonly FundExposureEntry[];
    equityCountries?: Readonly<Record<string, string>>;
    now?: number;
  },
): ResolvedGeoProfile {
  const registry = options?.registry ?? FUND_EXPOSURE_REGISTRY;
  const equityCountries = options?.equityCountries ?? REPORTED_EQUITY_HQ_COUNTRIES;
  const now = options?.now ?? Date.now();
  const upperSymbol = asset.symbol.trim().toUpperCase();

  // 1. Native non-geographic classes (crypto, cash)
  if (asset.type === "crypto" || asset.type === "cash") {
    return {
      kind: "non-geographic",
      canonicalId: `asset:${asset.type}:${upperSymbol}`,
      symbol: upperSymbol,
      isin: asset.isin?.trim().toUpperCase() || null,
      countryCode: null,
      countries: null,
      regions: { "Non-Geographic": 1 },
      source: asset.type === "crypto" ? "Crypto asset class" : "Cash balance",
      sourceUrl: null,
      methodology:
        asset.type === "crypto"
          ? "Cryptocurrencies have no sovereign equity headquarters and are classified as Non-Geographic."
          : "Cash balances are classified separately from underlying security geography as Non-Geographic.",
      asOfDate: null,
      dataQuality: "non-geographic",
      licenseStatus: "cleared",
      redistributionCleared: true,
      isBenchmarkProxy: false,
      stale: false,
    };
  }

  // 2. Fund identity match: expose breakdown weights ONLY if entry is explicitly cleared AND contains authorized weights
  const fund = resolveFundExposureEntry(
    { symbol: upperSymbol, isin: asset.isin, name: asset.name },
    registry,
  );
  if (fund) {
    const hasAuthorizedWeights = Boolean(fund.countries || fund.regions);
    if (!fund.redistributionCleared || !hasAuthorizedWeights) {
      return {
        kind: "fund",
        canonicalId: fund.canonicalId,
        symbol: upperSymbol,
        isin: asset.isin?.trim().toUpperCase() || fund.isins[0] || null,
        countryCode: null,
        countries: null,
        regions: { Unknown: 1 },
        source: fund.source,
        sourceUrl: fund.sourceUrl,
        methodology: WITHHELD_FUND_METHODOLOGY,
        asOfDate: fund.asOfDate,
        dataQuality: "license-restricted",
        licenseStatus: fund.licenseStatus,
        redistributionCleared: false,
        isBenchmarkProxy: false,
        stale: false,
      };
    }

    const regions = fund.countries
      ? aggregateCountriesToRegions(fund.countries)
      : normalizeRegionsMap(fund.regions ?? { Unknown: 1 });
    return {
      kind: "fund",
      canonicalId: fund.canonicalId,
      symbol: upperSymbol,
      isin: asset.isin?.trim().toUpperCase() || fund.isins[0] || null,
      countryCode: null,
      countries: fund.countries ?? null,
      regions,
      source: fund.source,
      sourceUrl: fund.sourceUrl,
      methodology: fund.methodology,
      asOfDate: fund.asOfDate,
      dataQuality: fund.dataQuality,
      licenseStatus: fund.licenseStatus,
      redistributionCleared: true,
      isBenchmarkProxy: fund.isBenchmarkProxy,
      stale: isGeoProfileStale(fund.asOfDate, fund.staleAfterDays ?? 90, now),
    };
  }

  // 3. Individual Equity reported corporate HQ jurisdiction (distinct from revenue exposure, risk country, or fund domicile)
  const iso =
    normalizeCountryToIso(asset.country) ??
    (asset.type === "stock" ? normalizeCountryToIso(equityCountries[upperSymbol]) : null);
  if (iso && iso !== "OTHR" && iso !== "CASHD_C") {
    const region = countryToGeoRegion(iso);
    return {
      kind: "equity",
      canonicalId: `equity:${upperSymbol}`,
      symbol: upperSymbol,
      isin: asset.isin?.trim().toUpperCase() || null,
      countryCode: iso,
      countries: { [iso]: 100 },
      regions: { [region]: 1 },
      source: "Public corporate HQ filing",
      sourceUrl: null,
      methodology:
        "Reported company headquarters (HQ) location from public corporate filings mapped to geographic regions. Does not represent revenue exposure, formal country-of-risk classification, fund domicile, or listing currency.",
      asOfDate: null,
      dataQuality: "provider-company-country",
      licenseStatus: "cleared",
      redistributionCleared: true,
      isBenchmarkProxy: false,
      stale: false,
    };
  }

  // 4. Unresolved instruments explicitly remain Unknown (never fall back to EUR->Europe or CSV North America)
  return {
    kind: "unavailable",
    canonicalId: `unresolved:${upperSymbol}`,
    symbol: upperSymbol,
    isin: asset.isin?.trim().toUpperCase() || null,
    countryCode: null,
    countries: null,
    regions: { Unknown: 1 },
    source: "Unavailable",
    sourceUrl: null,
    methodology:
      "Geographic breakdown is unavailable; held explicitly as Unknown rather than inferring from currency, exchange, or fund domicile.",
    asOfDate: null,
    dataQuality: "unavailable",
    licenseStatus: "cleared",
    redistributionCleared: true,
    isBenchmarkProxy: false,
    stale: false,
  };
}

/** Check whether a non-crypto/non-cash stock lacks a locally known HQ jurisdiction (server lookup disabled when unlicensed). */
export function needsServerCountryLookup(
  asset: Pick<Asset, "symbol" | "type"> & {
    isin?: string | null | undefined;
    country?: string | null | undefined;
  },
  registry: readonly FundExposureEntry[] = FUND_EXPOSURE_REGISTRY,
): boolean {
  if (asset.type !== "stock") return false;
  if (normalizeCountryToIso(asset.country)) return false;
  if (resolveFundExposureEntry({ symbol: asset.symbol, isin: asset.isin }, registry)) return false;
  if (normalizeCountryToIso(REPORTED_EQUITY_HQ_COUNTRIES[asset.symbol.trim().toUpperCase()])) {
    return false;
  }
  return true;
}

/** Neutral initial DB value for public.assets.region when creating new asset rows (display always uses on-read resolution). */
export function initialAssetRegion(
  asset: GeoAssetInput,
  options?: {
    registry?: readonly FundExposureEntry[];
    equityCountries?: Readonly<Record<string, string>>;
  },
): string {
  const resolved = resolveInstrumentGeoProfile(asset, options);
  if (resolved.dataQuality === "non-geographic") return "Non-Geographic";
  if (resolved.dataQuality === "license-restricted") return "Unknown";
  const entries = Object.entries(resolved.regions).filter(
    ([, weight]) => typeof weight === "number" && weight > 0,
  ) as [GeoRegion, number][];
  if (entries.length === 1) return entries[0]![0];
  if (entries.length > 1) return "Global";
  return "Unknown";
}

export interface PortfolioGeoRow {
  region: GeoRegion;
  name: string;
  value: number;
  share: number;
}

export interface PortfolioGeoHoldingDetail {
  symbol: string;
  name: string;
  value: number;
  profile: ResolvedGeoProfile;
}

export interface PortfolioGeographicSummary {
  rows: PortfolioGeoRow[];
  totalValue: number;
  verifiedValue: number;
  estimatedValue: number;
  nonGeographicValue: number;
  unknownValue: number;
  /** Part of unknownValue held in catalogued funds whose country split is not available to display. */
  withheldFundValue: number;
  /** Part of unknownValue held in instruments that are not identified at all. */
  unresolvedValue: number;
  /** Part of unknownValue that is an unallocated residual inside an otherwise available breakdown. */
  residualUnknownValue: number;
  staleValue: number;
  decomposedEtfs: string[];
  unresolvedAssets: string[];
  licenseWithheldAssets: string[];
  latestAsOfDate: string | null;
  sources: PortfolioGeoHoldingDetail[];
}

export type GeoHoldingInput = Pick<Holding, "value"> & {
  asset: GeoAssetInput;
};

/**
 * Computes portfolio-level weighted geographic exposure using only authorized/cleared data,
 * preserving Unknown, Non-Geographic, license-withheld funds, and total-value denominators without fabrication.
 */
export function calculatePortfolioGeographicExposure(
  holdings: readonly GeoHoldingInput[],
  labelFn: (raw: string) => string = (v) => v,
  options?: {
    registry?: readonly FundExposureEntry[];
    equityCountries?: Readonly<Record<string, string>>;
    now?: number;
  },
): PortfolioGeographicSummary {
  const regionTotals = new Map<GeoRegion, number>();
  const decomposedEtfs: string[] = [];
  const unresolvedAssets: string[] = [];
  const licenseWithheldAssets: string[] = [];
  const sources: PortfolioGeoHoldingDetail[] = [];

  let totalValue = 0;
  let verifiedValue = 0;
  let estimatedValue = 0;
  let nonGeographicValue = 0;
  let unknownValue = 0;
  let withheldFundValue = 0;
  let unresolvedValue = 0;
  let residualUnknownValue = 0;
  let staleValue = 0;
  let latestAsOfDate: string | null = null;

  for (const holding of holdings) {
    if (!Number.isFinite(holding.value) || holding.value <= 0) continue;
    totalValue += holding.value;

    const profile = resolveInstrumentGeoProfile(holding.asset, options);
    sources.push({
      symbol: holding.asset.symbol,
      name: holding.asset.name,
      value: holding.value,
      profile,
    });

    if (
      profile.kind === "fund" &&
      profile.dataQuality !== "license-restricted" &&
      !decomposedEtfs.includes(holding.asset.symbol)
    ) {
      decomposedEtfs.push(holding.asset.symbol);
    }
    if (
      profile.dataQuality === "license-restricted" &&
      !licenseWithheldAssets.includes(holding.asset.symbol)
    ) {
      licenseWithheldAssets.push(holding.asset.symbol);
    }
    if (profile.kind === "unavailable" && !unresolvedAssets.includes(holding.asset.symbol)) {
      unresolvedAssets.push(holding.asset.symbol);
    }
    if (profile.stale && profile.dataQuality !== "license-restricted") staleValue += holding.value;
    if (
      profile.asOfDate &&
      profile.dataQuality !== "license-restricted" &&
      (!latestAsOfDate || profile.asOfDate > latestAsOfDate)
    ) {
      latestAsOfDate = profile.asOfDate;
    }

    for (const [regionKey, rawWeight] of Object.entries(profile.regions)) {
      const region = regionKey as GeoRegion;
      const weight = typeof rawWeight === "number" && Number.isFinite(rawWeight) ? rawWeight : 0;
      if (weight <= 0) continue;

      const sliceValue = holding.value * weight;
      regionTotals.set(region, (regionTotals.get(region) ?? 0) + sliceValue);

      if (region === "Unknown") {
        unknownValue += sliceValue;
        if (profile.dataQuality === "license-restricted") withheldFundValue += sliceValue;
        else if (profile.kind === "unavailable") unresolvedValue += sliceValue;
        else residualUnknownValue += sliceValue;
      } else if (region === "Non-Geographic") {
        nonGeographicValue += sliceValue;
      } else if (profile.isBenchmarkProxy) {
        estimatedValue += sliceValue;
      } else {
        verifiedValue += sliceValue;
      }
    }
  }

  const rows: PortfolioGeoRow[] = [...regionTotals.entries()]
    .map(([region, value]) => ({
      region,
      name: labelFn(region),
      value,
      share: totalValue > 0 ? value / totalValue : 0,
    }))
    .sort((a, b) => b.value - a.value || a.region.localeCompare(b.region));

  return {
    rows,
    totalValue,
    verifiedValue,
    estimatedValue,
    nonGeographicValue,
    unknownValue,
    withheldFundValue,
    unresolvedValue,
    residualUnknownValue,
    staleValue,
    decomposedEtfs,
    unresolvedAssets,
    licenseWithheldAssets,
    latestAsOfDate,
    sources,
  };
}
