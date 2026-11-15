export interface CompanySuggestion {
  symbol: string;
  name: string;
}

// The existing DashboardMovers POPULAR stocks, excluding its crypto entry.
// This is a curated sample pool, not measured popularity or recommendations.
export const COMPANY_SUGGESTIONS: readonly CompanySuggestion[] = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AVGO", name: "Broadcom" },
  { symbol: "BRK-B", name: "Berkshire Hathaway" },
  { symbol: "LLY", name: "Eli Lilly" },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "WMT", name: "Walmart" },
  { symbol: "ORCL", name: "Oracle" },
  { symbol: "COST", name: "Costco" },
  { symbol: "TSLA", name: "Tesla" },
];

export function selectCompanySuggestions(
  previous: string | undefined,
  random: () => number,
): CompanySuggestion[] {
  const shuffled = [...COMPANY_SUGGESTIONS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  const selected = shuffled.slice(0, 8);
  const prior = new Set(previous?.split(","));
  // Compare membership, not order. Even an identical RNG sequence cannot
  // repeat the preceding combination; no unbounded random retry loop.
  if (prior.size === 8 && selected.every(({ symbol }) => prior.has(symbol))) {
    selected[7] = shuffled.find(({ symbol }) => !prior.has(symbol))!;
  }
  return selected;
}
