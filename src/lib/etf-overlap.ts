import type { Holding } from "./portfolio";

export interface EtfHoldingSet {
  symbol: string;
  holdings: { symbol: string; name: string; weight: number }[];
}

export interface UnderlyingExposure {
  symbol: string;
  name: string;
  weight: number;
  sources: string[];
}

export function calculateEtfOverlap(
  holdings: Holding[],
  compositions: EtfHoldingSet[],
): UnderlyingExposure[] {
  const portfolioValue = holdings.reduce(
    (sum, holding) => sum + (Number.isFinite(holding.value) ? Math.max(0, holding.value) : 0),
    0,
  );
  if (portfolioValue <= 0) return [];

  const values = new Map<string, UnderlyingExposure>();
  const add = (symbol: string, name: string, value: number, source: string) => {
    const key = symbol.toUpperCase();
    const current = values.get(key) ?? { symbol: key, name, weight: 0, sources: [] };
    current.weight += value / portfolioValue;
    if (!current.sources.includes(source)) current.sources.push(source);
    values.set(key, current);
  };

  for (const fund of compositions) {
    const fundValue = holdings.find(
      (holding) =>
        holding.asset.type === "etf" && holding.asset.symbol.toUpperCase() === fund.symbol,
    )?.value;
    if (!fundValue || fundValue <= 0) continue;
    for (const constituent of fund.holdings)
      add(constituent.symbol, constituent.name, fundValue * constituent.weight, fund.symbol);
  }
  for (const holding of holdings) {
    if (holding.asset.type === "stock" && holding.value > 0)
      add(holding.asset.symbol, holding.asset.name, holding.value, holding.asset.symbol);
  }
  return [...values.values()].sort((a, b) => b.weight - a.weight);
}
