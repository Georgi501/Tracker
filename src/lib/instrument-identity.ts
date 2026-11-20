import { CRYPTO_SYMBOLS } from "./crypto-assets";
import type { AssetType } from "./portfolio";

export interface VerifiedListing {
  canonicalId: string;
  isin: string;
  quoteSymbol: string;
  brokerSymbols: readonly string[];
  name: string;
  assetType: "etf" | "stock";
  tradingCurrency: "EUR" | "USD" | "GBP" | "GBX" | "CHF";
  isUcits: boolean;
  expectedExchanges: readonly string[];
  primaryForIsinCurrency?: boolean;
  /** True when the bare ticker collides with an unrelated active US listing (e.g. VXUS, EQQQ). */
  collidingBareTicker?: boolean;
  /** Tokens expected in the provider long/short name when disambiguating colliding tickers. */
  providerNameHints?: readonly RegExp[];
  /** Tokens that prove a provider quote belongs to an unrelated instrument. */
  forbiddenProviderNamePatterns?: readonly RegExp[];
}

export type QuoteRejectionReason =
  | "ticker_collision_blocked"
  | "currency_mismatch"
  | "exchange_mismatch"
  | "instrument_type_mismatch";

export interface ResolvedInstrumentIdentity {
  canonicalId: string | null;
  brokerSymbol: string;
  quoteSymbol: string;
  isin: string | null;
  name: string;
  effectiveType: AssetType;
  expectedCurrency: string | null;
  expectedExchanges: readonly string[] | null;
  isUcits: boolean;
  verified: boolean;
  forbidUsListingCollision: boolean;
  forbiddenProviderNamePatterns: readonly RegExp[];
}

export interface ProviderQuoteMetadata {
  providerSymbol?: string | null | undefined;
  currency?: string | null | undefined;
  exchangeName?: string | null | undefined;
  fullExchangeName?: string | null | undefined;
  instrumentType?: string | null | undefined;
  longName?: string | null | undefined;
  shortName?: string | null | undefined;
}

export type QuoteValidationResult = { ok: true } | { ok: false; reason: QuoteRejectionReason };

const VALID_ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
const EUROPEAN_ISIN_PREFIX_RE = /^(?:IE|LU|DE|FR|NL|GB|AT|BE|ES|IT|CH|SE|DK|FI|NO|PT)/;
const ETF_NAME_RE = /\b(?:ucits|etf|etc|etn|exchange[- ]traded\s+fund|index\s+fund)\b/i;
const UCITS_NAME_RE = /\bucits\b/i;
const US_EXCHANGES = new Set([
  "NGM",
  "NMS",
  "NCM",
  "NIM",
  "NYQ",
  "ASE",
  "PCX",
  "BTS",
  "PNK",
  "OTC",
  "OQX",
  "OQB",
  "YHD",
]);
const US_EQUITY_EXCHANGES = ["NGM", "NMS", "NCM", "NIM", "NYQ", "ASE", "PCX", "BTS"] as const;
const CRYPTO_SET = new Set<string>([...CRYPTO_SYMBOLS, "MATIC"]);

const SUFFIX_CURRENCY: Readonly<Record<string, string>> = {
  DE: "EUR",
  F: "EUR",
  AS: "EUR",
  PA: "EUR",
  MI: "EUR",
  MC: "EUR",
  BR: "EUR",
  LS: "EUR",
  VI: "EUR",
  HE: "EUR",
  IR: "EUR",
  L: "GBP",
  SW: "CHF",
};

const SUFFIX_EXCHANGE: Readonly<Record<string, readonly string[]>> = {
  DE: ["GER"],
  F: ["FRA"],
  AS: ["AMS"],
  PA: ["PAR"],
  MI: ["MIL"],
  MC: ["MCE"],
  L: ["LSE"],
  SW: ["EBS"],
};

export const VERIFIED_LISTINGS: readonly VerifiedListing[] = [
  // Vanguard FTSE All-World ex-US UCITS ETF (ISIN IE0009A5ADV9) — distinct from US VXUS (US9220427424)
  {
    canonicalId: "vanguard-ftse-all-world-ex-us-ucits",
    isin: "IE0009A5ADV9",
    quoteSymbol: "VXUS.DE",
    brokerSymbols: ["VXUS", "VXUA"],
    name: "Vanguard FTSE All-World ex-US UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
    collidingBareTicker: true,
    providerNameHints: [/ucits/i, /ftse\s+all[- ]?world\s+ex[- .]*u\.?s/i],
    forbiddenProviderNamePatterns: [/total\s+international\s+stock/i],
  },
  {
    canonicalId: "vanguard-ftse-all-world-ex-us-ucits",
    isin: "IE0009A5ADV9",
    quoteSymbol: "VXUS.AS",
    brokerSymbols: ["VXUS"],
    name: "Vanguard FTSE All-World ex-US UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["AMS"],
    collidingBareTicker: true,
    providerNameHints: [/ucits/i, /ftse\s+all[- ]?world\s+ex[- .]*u\.?s/i],
    forbiddenProviderNamePatterns: [/total\s+international\s+stock/i],
  },
  {
    canonicalId: "vanguard-ftse-all-world-ex-us-ucits",
    isin: "IE0009A5ADV9",
    quoteSymbol: "VXUS.L",
    brokerSymbols: ["VXUS"],
    name: "Vanguard FTSE All-World ex-US UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "GBP",
    isUcits: true,
    expectedExchanges: ["LSE"],
    primaryForIsinCurrency: true,
    collidingBareTicker: true,
    providerNameHints: [/ucits/i, /ftse\s+all[- ]?world\s+ex[- .]*u\.?s/i],
    forbiddenProviderNamePatterns: [/total\s+international\s+stock/i],
  },
  {
    canonicalId: "vanguard-total-international-stock-us",
    isin: "US9220427424",
    quoteSymbol: "VXUS",
    brokerSymbols: ["VXUS"],
    name: "Vanguard Total International Stock ETF",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: false,
    expectedExchanges: US_EQUITY_EXCHANGES,
    primaryForIsinCurrency: true,
    collidingBareTicker: true,
    forbiddenProviderNamePatterns: [/ucits/i],
  },

  // State Street SPDR S&P 500 UCITS ETF (Acc) (ISIN IE000XZSV718)
  {
    canonicalId: "spdr-sp500-ucits",
    isin: "IE000XZSV718",
    quoteSymbol: "SPYL.DE",
    brokerSymbols: ["SPYL"],
    name: "SPDR S&P 500 UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
    forbiddenProviderNamePatterns: [/latin\s+america/i],
  },
  {
    canonicalId: "spdr-sp500-ucits",
    isin: "IE000XZSV718",
    quoteSymbol: "SPYL.AS",
    brokerSymbols: ["SPYL"],
    name: "SPDR S&P 500 UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["AMS"],
    forbiddenProviderNamePatterns: [/latin\s+america/i],
  },
  {
    canonicalId: "spdr-sp500-ucits",
    isin: "IE000XZSV718",
    quoteSymbol: "SPYL.L",
    brokerSymbols: ["SPYL"],
    name: "SPDR S&P 500 UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "GBP",
    isUcits: true,
    expectedExchanges: ["LSE"],
    primaryForIsinCurrency: true,
    forbiddenProviderNamePatterns: [/latin\s+america/i],
  },
  {
    canonicalId: "spdr-sp500-ucits",
    isin: "IE000XZSV718",
    quoteSymbol: "SPYL.SW",
    brokerSymbols: ["SPYL"],
    name: "SPDR S&P 500 UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: true,
    expectedExchanges: ["EBS"],
    primaryForIsinCurrency: true,
    forbiddenProviderNamePatterns: [/latin\s+america/i],
  },

  // Vanguard FTSE All-World UCITS ETF
  {
    canonicalId: "vanguard-ftse-all-world",
    isin: "IE00BK5BQT80",
    quoteSymbol: "VWCE.DE",
    brokerSymbols: ["VWCE"],
    name: "Vanguard FTSE All-World UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "vanguard-ftse-all-world",
    isin: "IE00BK5BQT80",
    quoteSymbol: "VWRA.L",
    brokerSymbols: ["VWRA"],
    name: "Vanguard FTSE All-World UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: true,
    expectedExchanges: ["LSE"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "vanguard-ftse-all-world",
    isin: "IE00BK5BQT80",
    quoteSymbol: "VWRP.L",
    brokerSymbols: ["VWRP"],
    name: "Vanguard FTSE All-World UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "GBP",
    isUcits: true,
    expectedExchanges: ["LSE"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "vanguard-ftse-all-world",
    isin: "IE00B3RBWM25",
    quoteSymbol: "VWRL.AS",
    brokerSymbols: ["VWRL"],
    name: "Vanguard FTSE All-World UCITS ETF (Dist)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["AMS"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "vanguard-ftse-all-world",
    isin: "IE00B3RBWM25",
    quoteSymbol: "VGWL.DE",
    brokerSymbols: ["VGWL"],
    name: "Vanguard FTSE All-World UCITS ETF (Dist)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
  },

  // iShares Core MSCI World UCITS ETF
  {
    canonicalId: "ishares-core-msci-world",
    isin: "IE00B4L5Y983",
    quoteSymbol: "IWDA.AS",
    brokerSymbols: ["IWDA"],
    name: "iShares Core MSCI World UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["AMS"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "ishares-core-msci-world",
    isin: "IE00B4L5Y983",
    quoteSymbol: "EUNL.DE",
    brokerSymbols: ["EUNL"],
    name: "iShares Core MSCI World UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
  },
  {
    canonicalId: "ishares-core-msci-world",
    isin: "IE00B4L5Y983",
    quoteSymbol: "SWDA.L",
    brokerSymbols: ["SWDA"],
    name: "iShares Core MSCI World UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "GBP",
    isUcits: true,
    expectedExchanges: ["LSE"],
    primaryForIsinCurrency: true,
  },

  // iShares Core S&P 500 UCITS ETF
  {
    canonicalId: "ishares-core-sp500-ucits",
    isin: "IE00B5BMR087",
    quoteSymbol: "SXR8.DE",
    brokerSymbols: ["SXR8"],
    name: "iShares Core S&P 500 UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "ishares-core-sp500-ucits",
    isin: "IE00B5BMR087",
    quoteSymbol: "CSPX.L",
    brokerSymbols: ["CSPX"],
    name: "iShares Core S&P 500 UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: true,
    expectedExchanges: ["LSE"],
    primaryForIsinCurrency: true,
  },

  // Vanguard S&P 500 UCITS ETF
  {
    canonicalId: "vanguard-sp500-ucits",
    isin: "IE00BFMXXD54",
    quoteSymbol: "VUAA.DE",
    brokerSymbols: ["VUAA"],
    name: "Vanguard S&P 500 UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "vanguard-sp500-ucits",
    isin: "IE00B3XXRP09",
    quoteSymbol: "VUSA.AS",
    brokerSymbols: ["VUSA"],
    name: "Vanguard S&P 500 UCITS ETF (Dist)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["AMS"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "vanguard-sp500-ucits",
    isin: "IE00B3XXRP09",
    quoteSymbol: "VUSA.DE",
    brokerSymbols: ["VUSA"],
    name: "Vanguard S&P 500 UCITS ETF (Dist)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
  },

  // Nasdaq-100 UCITS ETFs
  {
    canonicalId: "nasdaq100-ucits",
    isin: "IE00B53SZB19",
    quoteSymbol: "SXRV.DE",
    brokerSymbols: ["SXRV"],
    name: "iShares Nasdaq 100 UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "nasdaq100-ucits",
    isin: "IE00B53SZB19",
    quoteSymbol: "CNDX.L",
    brokerSymbols: ["CNDX"],
    name: "iShares Nasdaq 100 UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: true,
    expectedExchanges: ["LSE"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "nasdaq100-ucits",
    isin: "IE0032077012",
    quoteSymbol: "EQQQ.DE",
    brokerSymbols: ["EQQQ"],
    name: "Invesco EQQQ Nasdaq-100 UCITS ETF (Dist)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
    collidingBareTicker: true,
    providerNameHints: [/ucits/i, /invesco\s+eqqq/i],
    forbiddenProviderNamePatterns: [/proshares/i, /ultra/i],
  },
  {
    canonicalId: "xtrackers-nasdaq100",
    isin: "IE00BMFKG444",
    quoteSymbol: "XNAS.DE",
    brokerSymbols: ["XNAS"],
    name: "Xtrackers Nasdaq 100 UCITS ETF 1C",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
  },

  // iShares MSCI World ex-USA UCITS ETF
  {
    canonicalId: "ishares-msci-world-ex-usa",
    isin: "IE000R4ZNTN3",
    quoteSymbol: "IXUA.DE",
    brokerSymbols: ["IXUA"],
    name: "iShares MSCI World ex-USA UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "ishares-msci-world-ex-usa",
    isin: "IE000R4ZNTN3",
    quoteSymbol: "XUSE.L",
    brokerSymbols: ["XUSE"],
    name: "iShares MSCI World ex-USA UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "GBP",
    isUcits: true,
    expectedExchanges: ["LSE"],
    primaryForIsinCurrency: true,
  },

  // iShares Core MSCI EM IMI UCITS ETF
  {
    canonicalId: "ishares-core-msci-em-imi",
    isin: "IE00BKM4GZ66",
    quoteSymbol: "IS3N.DE",
    brokerSymbols: ["IS3N"],
    name: "iShares Core MSCI EM IMI UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "ishares-core-msci-em-imi",
    isin: "IE00BKM4GZ66",
    quoteSymbol: "EIMI.L",
    brokerSymbols: ["EIMI"],
    name: "iShares Core MSCI EM IMI UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: true,
    expectedExchanges: ["LSE"],
    primaryForIsinCurrency: true,
  },

  // iShares MSCI ACWI UCITS ETF
  {
    canonicalId: "ishares-msci-acwi",
    isin: "IE00B6R52259",
    quoteSymbol: "IUSQ.DE",
    brokerSymbols: ["IUSQ"],
    name: "iShares MSCI ACWI UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "ishares-msci-acwi",
    isin: "IE00B6R52259",
    quoteSymbol: "SSAC.L",
    brokerSymbols: ["SSAC"],
    name: "iShares MSCI ACWI UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "GBP",
    isUcits: true,
    expectedExchanges: ["LSE"],
    primaryForIsinCurrency: true,
  },

  // Xtrackers MSCI World UCITS ETF
  {
    canonicalId: "xtrackers-msci-world",
    isin: "IE00BJ0KDQ92",
    quoteSymbol: "XDWD.DE",
    brokerSymbols: ["XDWD"],
    name: "Xtrackers MSCI World UCITS ETF 1C",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
  },

  // Vanguard FTSE All-World High Dividend Yield UCITS ETF
  {
    canonicalId: "vanguard-ftse-all-world-hdy",
    isin: "IE00B8GKDB10",
    quoteSymbol: "VHYL.AS",
    brokerSymbols: ["VHYL"],
    name: "Vanguard FTSE All-World High Dividend Yield UCITS ETF (Dist)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["AMS"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "vanguard-ftse-all-world-hdy",
    isin: "IE00B8GKDB10",
    quoteSymbol: "VHYD.L",
    brokerSymbols: ["VHYD"],
    name: "Vanguard FTSE All-World High Dividend Yield UCITS ETF (Dist)",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: true,
    expectedExchanges: ["LSE"],
    primaryForIsinCurrency: true,
  },

  // SPDR MSCI USA Small Cap Value Weighted UCITS ETF
  {
    canonicalId: "spdr-msci-usa-scv",
    isin: "IE00BSPLC413",
    quoteSymbol: "ZPRV.DE",
    brokerSymbols: ["ZPRV"],
    name: "SPDR MSCI USA Small Cap Value Weighted UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
  },

  // Europe STOXX 600 UCITS ETFs
  {
    canonicalId: "stoxx-europe-600-ishares-de",
    isin: "DE0002635307",
    quoteSymbol: "EXSA.DE",
    brokerSymbols: ["EXSA"],
    name: "iShares STOXX Europe 600 UCITS ETF (DE)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["GER"],
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "stoxx-europe-600-amundi-lu",
    isin: "LU0908500753",
    quoteSymbol: "MEUD.PA",
    brokerSymbols: ["MEUD"],
    name: "Amundi Core STOXX Europe 600 UCITS ETF (Acc)",
    assetType: "etf",
    tradingCurrency: "EUR",
    isUcits: true,
    expectedExchanges: ["PAR"],
    primaryForIsinCurrency: true,
  },

  // Major US ETFs (for collision protection and identity verification)
  {
    canonicalId: "us-sp500-etfs",
    isin: "US9229083632",
    quoteSymbol: "VOO",
    brokerSymbols: ["VOO"],
    name: "Vanguard S&P 500 ETF",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: false,
    expectedExchanges: US_EQUITY_EXCHANGES,
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "us-sp500-etfs",
    isin: "US78462F1030",
    quoteSymbol: "SPY",
    brokerSymbols: ["SPY"],
    name: "SPDR S&P 500 ETF Trust",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: false,
    expectedExchanges: US_EQUITY_EXCHANGES,
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "us-sp500-etfs",
    isin: "US4642872000",
    quoteSymbol: "IVV",
    brokerSymbols: ["IVV"],
    name: "iShares Core S&P 500 ETF",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: false,
    expectedExchanges: US_EQUITY_EXCHANGES,
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "vanguard-total-stock-us",
    isin: "US9229087690",
    quoteSymbol: "VTI",
    brokerSymbols: ["VTI"],
    name: "Vanguard Total Stock Market ETF",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: false,
    expectedExchanges: US_EQUITY_EXCHANGES,
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "qqq-nasdaq100",
    isin: "US46090E1038",
    quoteSymbol: "QQQ",
    brokerSymbols: ["QQQ"],
    name: "Invesco QQQ Trust",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: false,
    expectedExchanges: US_EQUITY_EXCHANGES,
    primaryForIsinCurrency: true,
  },
  {
    canonicalId: "vanguard-total-bond-us",
    isin: "US9219378356",
    quoteSymbol: "BND",
    brokerSymbols: ["BND"],
    name: "Vanguard Total Bond Market ETF",
    assetType: "etf",
    tradingCurrency: "USD",
    isUcits: false,
    expectedExchanges: US_EQUITY_EXCHANGES,
    primaryForIsinCurrency: true,
  },
];

export function isValidIsin(isin: string | null | undefined): isin is string {
  return Boolean(isin && VALID_ISIN_RE.test(isin.trim().toUpperCase()));
}

export function isEuropeanUcitsIsin(isin: string | null | undefined): boolean {
  if (!isValidIsin(isin)) return false;
  return EUROPEAN_ISIN_PREFIX_RE.test(isin.trim().toUpperCase());
}

export function isEtfInstrumentName(name: string | null | undefined): boolean {
  return Boolean(name && ETF_NAME_RE.test(name));
}

export function isUcitsInstrumentName(name: string | null | undefined): boolean {
  return Boolean(name && UCITS_NAME_RE.test(name));
}

function normalizeCurrencyCode(raw: string | null | undefined): string | null {
  const cur = raw?.trim().toUpperCase() ?? "";
  if (!cur) return null;
  if (cur === "GBP" || cur === "GBX") return raw?.trim() === "GBp" ? "GBX" : cur;
  return cur;
}

function currencyCompatible(expected: string, actualRaw: string): boolean {
  const exp = expected.toUpperCase();
  const act = actualRaw.trim().toUpperCase();
  if (exp === act) return true;
  if ((exp === "GBP" || exp === "GBX") && (act === "GBP" || act === "GBX" || act === "GBP")) {
    return actualRaw.trim() === "GBp" || act === "GBP" || act === "GBX";
  }
  return false;
}

function selectListingForIsin(
  isin: string,
  symbolUpper: string,
  currencyUpper: string | null,
): VerifiedListing | null {
  const candidates = VERIFIED_LISTINGS.filter((item) => item.isin === isin);
  if (!candidates.length) return null;

  if (symbolUpper) {
    const exact = candidates.find((item) => item.quoteSymbol.toUpperCase() === symbolUpper);
    if (exact) return exact;
  }

  const mappedCurrency = currencyUpper === "BGN" ? "EUR" : currencyUpper;
  const currencyMatches = mappedCurrency
    ? candidates.filter((item) => currencyCompatible(item.tradingCurrency, mappedCurrency))
    : [];

  if (symbolUpper && currencyMatches.length) {
    const brokerCurMatch =
      currencyMatches.find(
        (item) => item.brokerSymbols.includes(symbolUpper) && item.primaryForIsinCurrency !== false,
      ) ?? currencyMatches.find((item) => item.brokerSymbols.includes(symbolUpper));
    if (brokerCurMatch) return brokerCurMatch;
  }

  if (currencyMatches.length) {
    return (
      currencyMatches.find((item) => item.primaryForIsinCurrency) ?? currencyMatches[0] ?? null
    );
  }

  if (symbolUpper) {
    const brokerMatch = candidates.find((item) => item.brokerSymbols.includes(symbolUpper));
    if (brokerMatch) return brokerMatch;
  }

  return candidates.find((item) => item.primaryForIsinCurrency) ?? candidates[0] ?? null;
}

function matchesProviderNameHints(listing: VerifiedListing, name: string): boolean {
  if (!listing.providerNameHints?.length) return false;
  return listing.providerNameHints.some((re) => re.test(name));
}

function findVerifiedListingFromInputs(input: {
  symbol: string;
  isin?: string | null | undefined;
  name?: string | null | undefined;
  currency?: string | null | undefined;
}): { listing: VerifiedListing | null; explicitUnknownValidIsin: string | null } {
  const symbolUpper = input.symbol.trim().toUpperCase();
  const isinUpper = input.isin?.trim().toUpperCase() ?? "";
  const validIsin = VALID_ISIN_RE.test(isinUpper) ? isinUpper : null;
  const curUpper = normalizeCurrencyCode(input.currency);
  const name = input.name?.trim() ?? "";

  if (validIsin) {
    const byIsin = selectListingForIsin(validIsin, symbolUpper, curUpper);
    if (byIsin) return { listing: byIsin, explicitUnknownValidIsin: null };
    // Never borrow another fund's listing when an explicit valid ISIN is absent from the catalog.
    return { listing: null, explicitUnknownValidIsin: validIsin };
  }

  if (symbolUpper) {
    const exact = VERIFIED_LISTINGS.find((item) => item.quoteSymbol.toUpperCase() === symbolUpper);
    if (exact && !exact.collidingBareTicker) {
      return { listing: exact, explicitUnknownValidIsin: null };
    }

    const bareCandidates = VERIFIED_LISTINGS.filter((item) =>
      item.brokerSymbols.includes(symbolUpper),
    );
    if (bareCandidates.length) {
      // If any candidate has a colliding bare ticker (e.g. VXUS, EQQQ), require explicit disambiguation.
      const hasCollision = bareCandidates.some((item) => item.collidingBareTicker);
      if (hasCollision) {
        const mappedCur = curUpper === "BGN" ? "EUR" : curUpper;
        if (name) {
          const ucitsByName = bareCandidates.find(
            (item) => item.isUcits && matchesProviderNameHints(item, name),
          );
          if (ucitsByName) {
            const byCur = mappedCur
              ? (bareCandidates.find(
                  (item) =>
                    item.isin === ucitsByName.isin &&
                    currencyCompatible(item.tradingCurrency, mappedCur) &&
                    item.primaryForIsinCurrency !== false,
                ) ??
                bareCandidates.find(
                  (item) =>
                    item.isin === ucitsByName.isin &&
                    currencyCompatible(item.tradingCurrency, mappedCur),
                ))
              : null;
            return { listing: byCur ?? ucitsByName, explicitUnknownValidIsin: null };
          }
          if (isUcitsInstrumentName(name)) {
            const byCur = mappedCur
              ? (bareCandidates.find(
                  (item) =>
                    item.isUcits &&
                    currencyCompatible(item.tradingCurrency, mappedCur) &&
                    item.primaryForIsinCurrency !== false,
                ) ??
                bareCandidates.find(
                  (item) => item.isUcits && currencyCompatible(item.tradingCurrency, mappedCur),
                ))
              : null;
            const ucitsMatch = byCur ?? bareCandidates.find((item) => item.isUcits);
            if (ucitsMatch) return { listing: ucitsMatch, explicitUnknownValidIsin: null };
          }
        }
        if (mappedCur && mappedCur !== "USD") {
          const curUcits =
            bareCandidates.find(
              (item) =>
                currencyCompatible(item.tradingCurrency, mappedCur) &&
                item.primaryForIsinCurrency !== false,
            ) ?? bareCandidates.find((item) => currencyCompatible(item.tradingCurrency, mappedCur));
          if (curUcits) return { listing: curUcits, explicitUnknownValidIsin: null };
        }
        const nonUcits = bareCandidates.find((item) => !item.isUcits);
        if (nonUcits) return { listing: nonUcits, explicitUnknownValidIsin: null };
        if (exact) return { listing: exact, explicitUnknownValidIsin: null };
        return { listing: null, explicitUnknownValidIsin: null };
      }

      if (curUpper) {
        const mappedCur = curUpper === "BGN" ? "EUR" : curUpper;
        const curMatch =
          bareCandidates.find(
            (item) =>
              currencyCompatible(item.tradingCurrency, mappedCur) &&
              item.primaryForIsinCurrency !== false,
          ) ?? bareCandidates.find((item) => currencyCompatible(item.tradingCurrency, mappedCur));
        if (curMatch) return { listing: curMatch, explicitUnknownValidIsin: null };
      }
      return {
        listing: bareCandidates.find((item) => item.primaryForIsinCurrency) ?? bareCandidates[0]!,
        explicitUnknownValidIsin: null,
      };
    }
  }

  return { listing: null, explicitUnknownValidIsin: null };
}

export function guessInstrumentAssetType(input: {
  symbol: string;
  isin?: string | null | undefined;
  name?: string | null | undefined;
  declaredType?: AssetType | undefined;
}): AssetType {
  const upper = input.symbol.trim().toUpperCase();
  if (
    input.declaredType === "cash" ||
    input.declaredType === "bond" ||
    input.declaredType === "realEstate"
  ) {
    return input.declaredType;
  }
  if (input.declaredType === "crypto" || CRYPTO_SET.has(upper)) {
    return "crypto";
  }
  const { listing } = findVerifiedListingFromInputs({
    symbol: upper,
    isin: input.isin,
    name: input.name,
  });
  if (listing) return listing.assetType;
  if (isEtfInstrumentName(input.name)) return "etf";
  return input.declaredType ?? "stock";
}

function suffixCurrencyAndExchange(symbol: string): {
  currency: string | null;
  exchanges: readonly string[] | null;
} {
  const dotIdx = symbol.lastIndexOf(".");
  if (dotIdx < 0) return { currency: null, exchanges: null };
  const suffix = symbol.slice(dotIdx + 1).toUpperCase();
  return {
    currency: SUFFIX_CURRENCY[suffix] ?? null,
    exchanges: SUFFIX_EXCHANGE[suffix] ?? null,
  };
}

export function resolveImportedInstrument(input: {
  symbol: string;
  isin?: string | null | undefined;
  name?: string | null | undefined;
  currency?: string | null | undefined;
  declaredType?: AssetType | undefined;
}): ResolvedInstrumentIdentity {
  const brokerSymbol = input.symbol.trim().toUpperCase();
  const inputName = input.name?.trim() || brokerSymbol;
  const declaredType = input.declaredType;

  if (declaredType === "crypto" || CRYPTO_SET.has(brokerSymbol)) {
    return {
      canonicalId: `crypto:${brokerSymbol}`,
      brokerSymbol,
      quoteSymbol: brokerSymbol,
      isin: null,
      name: inputName,
      effectiveType: "crypto",
      expectedCurrency: "USD",
      expectedExchanges: null,
      isUcits: false,
      verified: true,
      forbidUsListingCollision: false,
      forbiddenProviderNamePatterns: [],
    };
  }

  if (declaredType === "cash" || declaredType === "bond" || declaredType === "realEstate") {
    return {
      canonicalId: `${declaredType}:${brokerSymbol}`,
      brokerSymbol,
      quoteSymbol: brokerSymbol,
      isin: null,
      name: inputName,
      effectiveType: declaredType,
      expectedCurrency: normalizeCurrencyCode(input.currency),
      expectedExchanges: null,
      isUcits: false,
      verified: true,
      forbidUsListingCollision: false,
      forbiddenProviderNamePatterns: [],
    };
  }

  const { listing, explicitUnknownValidIsin } = findVerifiedListingFromInputs({
    symbol: brokerSymbol,
    isin: input.isin,
    name: inputName,
    currency: input.currency,
  });

  if (listing) {
    return {
      canonicalId: listing.canonicalId,
      brokerSymbol,
      quoteSymbol: listing.quoteSymbol,
      isin: explicitUnknownValidIsin ?? listing.isin,
      name: inputName === brokerSymbol ? listing.name : inputName,
      effectiveType: listing.assetType,
      expectedCurrency: listing.tradingCurrency,
      expectedExchanges: listing.expectedExchanges,
      isUcits: listing.isUcits,
      verified: true,
      forbidUsListingCollision: false,
      forbiddenProviderNamePatterns: listing.forbiddenProviderNamePatterns ?? [],
    };
  }

  const effectiveType = guessInstrumentAssetType({
    symbol: brokerSymbol,
    isin: input.isin,
    name: inputName,
    declaredType,
  });
  const suffixInfo = suffixCurrencyAndExchange(brokerSymbol);
  const tradeCur = normalizeCurrencyCode(input.currency);
  const normalizedCur = tradeCur === "BGN" ? "EUR" : tradeCur;
  const hasSuffix = brokerSymbol.includes(".");
  const europeanIsin = isEuropeanUcitsIsin(explicitUnknownValidIsin);
  const ucitsName = isUcitsInstrumentName(inputName);
  const nonUsCurrency =
    normalizedCur === "EUR" || normalizedCur === "GBP" || normalizedCur === "GBX";
  // If we hold a European/UCITS bare symbol with no verified Yahoo listing suffix, block US ticker collisions.
  const forbidUsListingCollision = !hasSuffix && (europeanIsin || ucitsName);

  return {
    canonicalId: explicitUnknownValidIsin
      ? `isin:${explicitUnknownValidIsin}:${suffixInfo.currency ?? normalizedCur ?? "UNK"}`
      : `symbol:${brokerSymbol}`,
    brokerSymbol,
    quoteSymbol: brokerSymbol,
    isin: explicitUnknownValidIsin,
    name: inputName,
    effectiveType,
    expectedCurrency: suffixInfo.currency ?? (nonUsCurrency ? normalizedCur : null),
    expectedExchanges: suffixInfo.exchanges,
    isUcits: ucitsName || europeanIsin,
    verified: false,
    forbidUsListingCollision,
    forbiddenProviderNamePatterns: [],
  };
}

export function resolveAssetIdentity(input: {
  symbol: string;
  name?: string | null | undefined;
  type: AssetType;
  isin?: string | null | undefined;
  quoteSymbol?: string | null | undefined;
  expectedCurrency?: string | null | undefined;
}): ResolvedInstrumentIdentity {
  const resolved = resolveImportedInstrument({
    symbol: input.quoteSymbol?.trim() || input.symbol,
    isin: input.isin,
    name: input.name,
    currency: input.expectedCurrency,
    declaredType: input.type,
  });
  return {
    ...resolved,
    brokerSymbol: input.symbol.trim().toUpperCase(),
  };
}

export function canonicalIdentityKey(input: {
  symbol: string;
  name?: string | null | undefined;
  type?: AssetType | undefined;
  isin?: string | null | undefined;
  currency?: string | null | undefined;
}): string {
  const resolved = resolveImportedInstrument({
    symbol: input.symbol,
    isin: input.isin,
    name: input.name,
    currency: input.currency,
    declaredType: input.type,
  });
  if (resolved.isin) {
    return `isin:${resolved.isin}:${resolved.expectedCurrency ?? "UNK"}`;
  }
  return `listing:${resolved.quoteSymbol.toUpperCase()}`;
}

export function validateQuoteIdentity(
  identity: ResolvedInstrumentIdentity,
  meta: ProviderQuoteMetadata,
): QuoteValidationResult {
  if (identity.forbidUsListingCollision) {
    return { ok: false, reason: "ticker_collision_blocked" };
  }

  const exchange = meta.exchangeName?.trim().toUpperCase() ?? "";
  const instType = meta.instrumentType?.trim().toUpperCase() ?? "";
  const currency = meta.currency?.trim() ?? "";
  const providerName = `${meta.longName ?? ""} ${meta.shortName ?? ""}`.trim();

  if (instType && ["CURRENCY", "INDEX", "FUTURE"].includes(instType)) {
    return { ok: false, reason: "instrument_type_mismatch" };
  }

  if (identity.effectiveType === "etf" && instType === "EQUITY") {
    return { ok: false, reason: "instrument_type_mismatch" };
  }

  if (identity.isUcits && exchange && US_EXCHANGES.has(exchange)) {
    return { ok: false, reason: "ticker_collision_blocked" };
  }

  if (
    identity.forbiddenProviderNamePatterns.some(
      (pattern) => providerName && pattern.test(providerName),
    )
  ) {
    return { ok: false, reason: "ticker_collision_blocked" };
  }

  if (
    identity.expectedExchanges?.length &&
    exchange &&
    !identity.expectedExchanges.includes(exchange)
  ) {
    return { ok: false, reason: "exchange_mismatch" };
  }

  if (
    identity.expectedCurrency &&
    currency &&
    !currencyCompatible(identity.expectedCurrency, currency)
  ) {
    return { ok: false, reason: "currency_mismatch" };
  }

  return { ok: true };
}
