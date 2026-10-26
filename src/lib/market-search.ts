import { z } from "zod";
import { CRYPTO_ASSETS } from "./crypto-assets";

export const marketSearchSchema = z.object({ query: z.string().trim().min(1).max(60) });
export interface MarketAsset {
  symbol: string;
  name: string;
  type: "stock" | "etf" | "crypto";
}
export const MARKET_ASSETS: MarketAsset[] = [
  { symbol: "META", name: "Meta Platforms Inc. (Facebook)", type: "stock" },
  { symbol: "UBER", name: "Uber Technologies Inc.", type: "stock" },
  { symbol: "NFLX", name: "Netflix Inc.", type: "stock" },
  { symbol: "AAPL", name: "Apple Inc.", type: "stock" },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "stock" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Google)", type: "stock" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock" },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock" },
  { symbol: "AVGO", name: "Broadcom Inc.", type: "stock" },
  { symbol: "BRK-B", name: "Berkshire Hathaway Inc. Class B", type: "stock" },
  { symbol: "LLY", name: "Eli Lilly and Company", type: "stock" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", type: "stock" },
  { symbol: "WMT", name: "Walmart Inc.", type: "stock" },
  { symbol: "ORCL", name: "Oracle Corporation", type: "stock" },
  { symbol: "COST", name: "Costco Wholesale Corporation", type: "stock" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock" },
  { symbol: "KO", name: "Coca-Cola Co.", type: "stock" },
  { symbol: "ASML", name: "ASML Holding", type: "stock" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "etf" },
  { symbol: "BTC", name: "Bitcoin", type: "crypto" },
  { symbol: "ETH", name: "Ethereum", type: "crypto" },
];
export interface UcitsInfo {
  isin: string;
  domicile: "IE" | "LU" | "DE";
  policy: "acc" | "dist";
  index: string;
}
/** Popular UCITS ETFs with verified ISIN, domicile and distribution policy (static fund facts, not prices). */
export const UCITS: (MarketAsset & UcitsInfo)[] = [
  {
    symbol: "VWCE.DE",
    name: "Vanguard FTSE All-World UCITS ETF (Acc)",
    type: "etf",
    isin: "IE00BK5BQT80",
    domicile: "IE",
    policy: "acc",
    index: "FTSE All-World",
  },
  {
    symbol: "VWRL.AS",
    name: "Vanguard FTSE All-World UCITS ETF (Dist)",
    type: "etf",
    isin: "IE00B3RBWM25",
    domicile: "IE",
    policy: "dist",
    index: "FTSE All-World",
  },
  {
    symbol: "IWDA.AS",
    name: "iShares Core MSCI World UCITS ETF (Acc)",
    type: "etf",
    isin: "IE00B4L5Y983",
    domicile: "IE",
    policy: "acc",
    index: "MSCI World",
  },
  {
    symbol: "EUNL.DE",
    name: "iShares Core MSCI World UCITS ETF (Acc)",
    type: "etf",
    isin: "IE00B4L5Y983",
    domicile: "IE",
    policy: "acc",
    index: "MSCI World",
  },
  {
    symbol: "XDWD.DE",
    name: "Xtrackers MSCI World UCITS ETF 1C",
    type: "etf",
    isin: "IE00BJ0KDQ92",
    domicile: "IE",
    policy: "acc",
    index: "MSCI World",
  },
  {
    symbol: "SSAC.L",
    name: "iShares MSCI ACWI UCITS ETF (Acc)",
    type: "etf",
    isin: "IE00B6R52259",
    domicile: "IE",
    policy: "acc",
    index: "MSCI ACWI",
  },
  {
    symbol: "IUSQ.DE",
    name: "iShares MSCI ACWI UCITS ETF (Acc)",
    type: "etf",
    isin: "IE00B6R52259",
    domicile: "IE",
    policy: "acc",
    index: "MSCI ACWI",
  },
  {
    symbol: "SXR8.DE",
    name: "iShares Core S&P 500 UCITS ETF (Acc)",
    type: "etf",
    isin: "IE00B5BMR087",
    domicile: "IE",
    policy: "acc",
    index: "S&P 500",
  },
  {
    symbol: "CSPX.L",
    name: "iShares Core S&P 500 UCITS ETF (Acc)",
    type: "etf",
    isin: "IE00B5BMR087",
    domicile: "IE",
    policy: "acc",
    index: "S&P 500",
  },
  {
    symbol: "VUAA.DE",
    name: "Vanguard S&P 500 UCITS ETF (Acc)",
    type: "etf",
    isin: "IE00BFMXXD54",
    domicile: "IE",
    policy: "acc",
    index: "S&P 500",
  },
  {
    symbol: "VUSA.AS",
    name: "Vanguard S&P 500 UCITS ETF (Dist)",
    type: "etf",
    isin: "IE00B3XXRP09",
    domicile: "IE",
    policy: "dist",
    index: "S&P 500",
  },
  {
    symbol: "SPYL.DE",
    name: "SPDR S&P 500 UCITS ETF (Acc)",
    type: "etf",
    isin: "IE000XZSV718",
    domicile: "IE",
    policy: "acc",
    index: "S&P 500",
  },
  {
    symbol: "SXRV.DE",
    name: "iShares Nasdaq 100 UCITS ETF (Acc)",
    type: "etf",
    isin: "IE00B53SZB19",
    domicile: "IE",
    policy: "acc",
    index: "Nasdaq-100",
  },
  {
    symbol: "EQQQ.DE",
    name: "Invesco EQQQ Nasdaq-100 UCITS ETF (Dist)",
    type: "etf",
    isin: "IE0032077012",
    domicile: "IE",
    policy: "dist",
    index: "Nasdaq-100",
  },
  {
    symbol: "IS3N.DE",
    name: "iShares Core MSCI EM IMI UCITS ETF (Acc)",
    type: "etf",
    isin: "IE00BKM4GZ66",
    domicile: "IE",
    policy: "acc",
    index: "MSCI EM IMI",
  },
  {
    symbol: "VHYL.AS",
    name: "Vanguard FTSE All-World High Dividend Yield UCITS ETF (Dist)",
    type: "etf",
    isin: "IE00B8GKDB10",
    domicile: "IE",
    policy: "dist",
    index: "FTSE All-World High Dividend Yield",
  },
  {
    symbol: "ZPRV.DE",
    name: "SPDR MSCI USA Small Cap Value Weighted UCITS ETF (Acc)",
    type: "etf",
    isin: "IE00BSPLC413",
    domicile: "IE",
    policy: "acc",
    index: "MSCI USA Small Cap Value Weighted",
  },
  {
    symbol: "MEUD.PA",
    name: "Amundi Core Stoxx Europe 600 UCITS ETF (Acc)",
    type: "etf",
    isin: "LU0908500753",
    domicile: "LU",
    policy: "acc",
    index: "STOXX Europe 600",
  },
  {
    symbol: "EXSA.DE",
    name: "iShares STOXX Europe 600 UCITS ETF (DE) (Dist)",
    type: "etf",
    isin: "DE0002635307",
    domicile: "DE",
    policy: "dist",
    index: "STOXX Europe 600",
  },
];
MARKET_ASSETS.push(...UCITS.map(({ symbol, name, type }) => ({ symbol, name, type })));
export const ucitsInfo = (symbol: string) =>
  UCITS.find((u) => u.symbol.toUpperCase() === symbol.toUpperCase());
export const isIsin = (q: string) => /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(q.trim().toUpperCase());

export function searchCatalog(query: string): MarketAsset[] {
  const q = query.trim().toLowerCase();
  if (!q) return MARKET_ASSETS;
  const catalog = [
    ...MARKET_ASSETS,
    ...CRYPTO_ASSETS.map(({ symbol, name }) => ({ symbol, name, type: "crypto" as const })),
  ];
  const isin = (s: string) => ucitsInfo(s)?.isin.toLowerCase() ?? "";
  const words = q.split(/\s+/).filter(Boolean);
  const matches = catalog.filter((a) => {
    const hay =
      `${a.symbol} ${a.name} ${isin(a.symbol)} ${ucitsInfo(a.symbol) ? "ucits " + ucitsInfo(a.symbol)!.index : ""}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  return [...new Map(matches.map((asset) => [asset.symbol, asset])).values()].sort(
    (a, b) => Number(b.symbol.toLowerCase() === q) - Number(a.symbol.toLowerCase() === q),
  );
}
