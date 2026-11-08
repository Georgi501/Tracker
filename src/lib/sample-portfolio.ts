export const SAMPLE_HOLDINGS = [
  { symbol: "VWCE", name: "Vanguard FTSE All-World", cls: "ETF", qty: 40, cost: 112, value: 128 },
  { symbol: "AAPL", name: "Apple Inc.", cls: "Stock", qty: 15, cost: 170, value: 215 },
  { symbol: "MSFT", name: "Microsoft Corp.", cls: "Stock", qty: 8, cost: 290, value: 410 },
  { symbol: "BTC", name: "Bitcoin", cls: "Crypto", qty: 0.05, cost: 42000, value: 64000 },
  { symbol: "BND", name: "Vanguard Total Bond", cls: "Bonds", qty: 30, cost: 74, value: 72 },
] as const;

export const SAMPLE_HISTORY = [
  { month: "2026-05", value: 14650 },
  { month: "2026-06", value: 15180 },
  { month: "2026-07", value: 14920 },
  { month: "2026-08", value: 15940 },
  { month: "2026-09", value: 16230 },
  { month: "2026-10", value: 16985 },
] as const;

export const SAMPLE_DIVIDENDS = [
  { date: "2026-09-15", symbol: "AAPL", name: "Apple Inc.", amount: 3.75 },
  { date: "2026-09-15", symbol: "MSFT", name: "Microsoft Corp.", amount: 6.64 },
  { date: "2026-07-14", symbol: "BND", name: "Vanguard Total Bond", amount: 18.6 },
] as const;

export const SAMPLE_TOTAL_VALUE = SAMPLE_HOLDINGS.reduce(
  (total, holding) => total + holding.qty * holding.value,
  0,
);
export const SAMPLE_COST_BASIS = SAMPLE_HOLDINGS.reduce(
  (total, holding) => total + holding.qty * holding.cost,
  0,
);
export const SAMPLE_GAIN = SAMPLE_TOTAL_VALUE - SAMPLE_COST_BASIS;
export const SAMPLE_GAIN_PERCENT = (SAMPLE_GAIN / SAMPLE_COST_BASIS) * 100;
