import { z } from "zod";

export const marketSearchSchema = z.object({ query: z.string().trim().min(1).max(60) });
export interface MarketAsset { symbol: string; name: string; type: "stock" | "etf" | "crypto" }
export const MARKET_ASSETS: MarketAsset[] = [
  { symbol: "META", name: "Meta Platforms Inc. (Facebook)", type: "stock" },
  { symbol: "UBER", name: "Uber Technologies Inc.", type: "stock" },
  { symbol: "NFLX", name: "Netflix Inc.", type: "stock" },
  { symbol: "AAPL", name: "Apple Inc.", type: "stock" },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "stock" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Google)", type: "stock" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock" },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock" },
  { symbol: "KO", name: "Coca-Cola Co.", type: "stock" },
  { symbol: "ASML", name: "ASML Holding", type: "stock" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "etf" },
  { symbol: "VWCE.DE", name: "Vanguard FTSE All-World", type: "etf" },
  { symbol: "SPYL.DE", name: "SPDR S&P 500 UCITS ETF", type: "etf" },
  { symbol: "BTC", name: "Bitcoin", type: "crypto" },
  { symbol: "ETH", name: "Ethereum", type: "crypto" },
];
export function searchCatalog(query: string): MarketAsset[] {
  const q = query.trim().toLowerCase();
  return MARKET_ASSETS.filter((a) => `${a.symbol} ${a.name}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.symbol.toLowerCase() === q) - Number(a.symbol.toLowerCase() === q));
}