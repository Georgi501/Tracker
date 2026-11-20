import { currencyRate, type DailyPrice } from "./history";
import { languageLocale, type Lang } from "./i18n";
import {
  normalizeTransactionsForSplits,
  type CorporateAction,
  type Currency,
  type Holding,
  type Transaction,
} from "./portfolio";

export type CostBasisFxMethod = "usd-stored" | "dated-historical-fx" | "spot-fx-fallback";

export interface BaseCurrencyHoldingMetrics {
  assetId: string;
  symbol: string;
  currency: Currency;
  quantity: number;
  costBasis: number;
  avgCost: number;
  value: number;
  pnl: number;
  pnlPct: number;
  dayChange: number;
  costBasisMethod: CostBasisFxMethod;
}

export interface PortfolioBaseCurrencySummary {
  currency: Currency;
  byAssetId: Map<string, BaseCurrencyHoldingMetrics>;
  isComplete: boolean;
  missingQuoteSymbols: string[];
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPct: number;
  totalDayChange: number;
  datedFxComplete: boolean;
}

export interface BaseCurrencyAccountingOptions {
  liveEurPerUsd: number | null;
  eurUsdPrices?: readonly DailyPrice[] | undefined;
  splits?: readonly CorporateAction[] | undefined;
}

function replayEurCostByAsset(
  transactions: readonly Transaction[],
  splits: readonly CorporateAction[],
  eurUsdPrices: readonly DailyPrice[],
): Map<string, { qty: number; costEur: number; complete: boolean }> {
  const out = new Map<string, { qty: number; costEur: number; complete: boolean }>();
  if (!eurUsdPrices.length || !transactions.length) return out;
  const sorted = normalizeTransactionsForSplits([...transactions], [...splits]).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const priceList = eurUsdPrices as DailyPrice[];
  for (const tx of sorted) {
    if (tx.kind === "dividend") continue;
    const state = out.get(tx.assetId) ?? { qty: 0, costEur: 0, complete: true };
    if (tx.kind === "buy") {
      const rate = currencyRate("EUR", tx.date, priceList, []);
      if (rate === null || !(rate > 0)) {
        state.complete = false;
      } else {
        state.qty += tx.quantity;
        state.costEur += (tx.quantity * tx.price + (tx.fee ?? 0)) / rate;
      }
    } else {
      const sellQty = Math.min(tx.quantity, state.qty);
      const avg = state.qty > 0 ? state.costEur / state.qty : 0;
      state.qty -= sellQty;
      state.costEur -= avg * sellQty;
    }
    out.set(tx.assetId, state);
  }
  return out;
}

function computeSingleHoldingMetrics(
  holding: Holding,
  currency: Currency,
  liveEurPerUsd: number | null,
  replayedEur: { qty: number; costEur: number; complete: boolean } | undefined,
): BaseCurrencyHoldingMetrics {
  if (currency === "USD") {
    const value = holding.value;
    const costBasis = holding.costBasis;
    const pnl =
      Number.isFinite(value) && Number.isFinite(costBasis) ? value - costBasis : Number.NaN;
    const pnlPct =
      Number.isFinite(pnl) && Number.isFinite(costBasis) && costBasis > 0
        ? (pnl / costBasis) * 100
        : Number.NaN;
    return {
      assetId: holding.asset.id,
      symbol: holding.asset.symbol,
      currency,
      quantity: holding.quantity,
      costBasis,
      avgCost: holding.avgCost,
      value,
      pnl,
      pnlPct,
      dayChange: holding.dayChange,
      costBasisMethod: "usd-stored",
    };
  }

  const hasValidLiveFx =
    typeof liveEurPerUsd === "number" && Number.isFinite(liveEurPerUsd) && liveEurPerUsd > 0;

  let value = Number.NaN;
  if (Number.isFinite(holding.value)) {
    if (
      holding.asset.quoteCurrency === "EUR" &&
      typeof holding.asset.quoteNativePrice === "number" &&
      Number.isFinite(holding.asset.quoteNativePrice) &&
      holding.asset.quoteNativePrice > 0
    ) {
      // Avoid EUR -> USD -> EUR floating-point round-trip drift for EUR-quoted listings.
      value = holding.quantity * holding.asset.quoteNativePrice;
    } else if (hasValidLiveFx) {
      value = holding.value * liveEurPerUsd;
    }
  }

  let dayChange = Number.NaN;
  if (Number.isFinite(value) && Number.isFinite(holding.asset.change24h)) {
    const denom = 1 + holding.asset.change24h / 100;
    dayChange = denom > 0 ? value - value / denom : Number.NaN;
  } else if (Number.isFinite(holding.dayChange) && hasValidLiveFx) {
    dayChange = holding.dayChange * liveEurPerUsd;
  }

  let costBasis = Number.NaN;
  let avgCost = Number.NaN;
  let costBasisMethod: CostBasisFxMethod = "spot-fx-fallback";
  if (replayedEur && replayedEur.complete && replayedEur.qty > 1e-9) {
    costBasis = replayedEur.costEur;
    avgCost = replayedEur.costEur / replayedEur.qty;
    costBasisMethod = "dated-historical-fx";
  } else if (hasValidLiveFx && Number.isFinite(holding.costBasis)) {
    costBasis = holding.costBasis * liveEurPerUsd;
    avgCost = holding.avgCost * liveEurPerUsd;
    costBasisMethod = "spot-fx-fallback";
  }

  const pnl = Number.isFinite(value) && Number.isFinite(costBasis) ? value - costBasis : Number.NaN;
  const pnlPct =
    Number.isFinite(pnl) && Number.isFinite(costBasis) && costBasis > 0
      ? (pnl / costBasis) * 100
      : Number.NaN;

  return {
    assetId: holding.asset.id,
    symbol: holding.asset.symbol,
    currency,
    quantity: holding.quantity,
    costBasis,
    avgCost,
    value,
    pnl,
    pnlPct,
    dayChange,
    costBasisMethod,
  };
}

export function computeHoldingBaseMetrics(
  holding: Holding,
  transactions: readonly Transaction[],
  currency: Currency,
  options: BaseCurrencyAccountingOptions,
): BaseCurrencyHoldingMetrics {
  const eurByAsset =
    currency === "EUR" && options.eurUsdPrices?.length
      ? replayEurCostByAsset(
          transactions.filter((tx) => tx.assetId === holding.asset.id),
          options.splits ?? [],
          options.eurUsdPrices,
        )
      : new Map<string, { qty: number; costEur: number; complete: boolean }>();
  return computeSingleHoldingMetrics(
    holding,
    currency,
    options.liveEurPerUsd,
    eurByAsset.get(holding.asset.id),
  );
}

export function computePortfolioBaseMetrics(
  holdings: readonly Holding[],
  transactions: readonly Transaction[],
  currency: Currency,
  options: BaseCurrencyAccountingOptions,
): PortfolioBaseCurrencySummary {
  const eurByAsset =
    currency === "EUR" && options.eurUsdPrices?.length
      ? replayEurCostByAsset(transactions, options.splits ?? [], options.eurUsdPrices)
      : new Map<string, { qty: number; costEur: number; complete: boolean }>();

  const byAssetId = new Map<string, BaseCurrencyHoldingMetrics>();
  const missingQuoteSymbols: string[] = [];
  let totalValue = 0;
  let totalCost = 0;
  let totalDayChange = 0;
  let hasAllCosts = true;
  let datedFxComplete = true;

  for (const holding of holdings) {
    const metrics = computeSingleHoldingMetrics(
      holding,
      currency,
      options.liveEurPerUsd,
      eurByAsset.get(holding.asset.id),
    );
    byAssetId.set(holding.asset.id, metrics);

    if (!Number.isFinite(metrics.value)) {
      missingQuoteSymbols.push(holding.asset.symbol);
    } else {
      totalValue += metrics.value;
    }

    if (Number.isFinite(metrics.dayChange)) {
      totalDayChange += metrics.dayChange;
    } else if (Number.isFinite(metrics.value)) {
      totalDayChange = Number.NaN;
    }

    if (Number.isFinite(metrics.costBasis)) {
      totalCost += metrics.costBasis;
    } else {
      hasAllCosts = false;
    }

    if (currency === "EUR" && metrics.costBasisMethod !== "dated-historical-fx") {
      datedFxComplete = false;
    }
  }

  const isComplete = missingQuoteSymbols.length === 0;
  const resolvedTotalValue = isComplete ? totalValue : Number.NaN;
  const resolvedTotalCost = hasAllCosts ? totalCost : Number.NaN;
  const resolvedTotalDayChange = isComplete ? totalDayChange : Number.NaN;
  const totalPnl =
    isComplete && Number.isFinite(resolvedTotalValue) && Number.isFinite(resolvedTotalCost)
      ? resolvedTotalValue - resolvedTotalCost
      : Number.NaN;
  const totalPnlPct =
    Number.isFinite(totalPnl) && Number.isFinite(resolvedTotalCost) && resolvedTotalCost > 0
      ? (totalPnl / resolvedTotalCost) * 100
      : Number.NaN;

  return {
    currency,
    byAssetId,
    isComplete,
    missingQuoteSymbols,
    totalValue: resolvedTotalValue,
    totalCost: resolvedTotalCost,
    totalPnl,
    totalPnlPct,
    totalDayChange: resolvedTotalDayChange,
    datedFxComplete,
  };
}

export function formatBaseCurrencyAmount(
  amount: number,
  currency: Currency,
  lang: Lang,
  opts?: { sign?: boolean; compact?: boolean },
): string {
  if (!Number.isFinite(amount)) return "—";
  const formatted = new Intl.NumberFormat(languageLocale(lang), {
    style: "currency",
    currency,
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: opts?.compact ? 1 : 2,
  }).format(amount);
  return opts?.sign && amount > 0 ? `+${formatted}` : formatted;
}
