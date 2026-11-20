import { currencyRate, type DailyPrice } from "./history";
import { languageLocale, type Lang } from "./i18n";
import {
  normalizeTransactionsForSplits,
  type CorporateAction,
  type Currency,
  type Holding,
  type Transaction,
} from "./portfolio";

/**
 * Single rounding convention across all portfolio views:
 * All holding values, cost bases, unrealized P&L, day changes, FIFO realized gains, proceeds,
 * and historical transaction sums are accumulated in unrounded IEEE-754 floating-point
 * precision and rounded once at display time via `Intl.NumberFormat(..., { style: "currency",
 * currency, maximumFractionDigits: 2 })`.
 */

export type CostBasisFxMethod = "usd-stored" | "dated-historical-fx" | "spot-fx-fallback";
export type RealizedFxMethod =
  "usd-stored" | "dated-historical-fx" | "no-sales" | "missing-historical-fx";
export type HistoricalAmountMethod =
  "usd-stored" | "dated-historical-fx" | "usd-fallback-missing-fx";

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
  spotFallbackSymbols: string[];
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

function orderedDailyPrices(prices: readonly DailyPrice[] | undefined): DailyPrice[] {
  if (!prices?.length) return [];
  for (let i = 1; i < prices.length; i += 1) {
    if (prices[i]!.date < prices[i - 1]!.date) {
      return [...prices].sort((a, b) => a.date.localeCompare(b.date));
    }
  }
  return prices as DailyPrice[];
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
  const priceList = orderedDailyPrices(eurUsdPrices);
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
  if (
    replayedEur &&
    replayedEur.complete &&
    replayedEur.qty > 1e-9 &&
    Math.abs(replayedEur.qty - holding.quantity) <= 1e-6
  ) {
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
  const spotFallbackSymbols: string[] = [];
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
      spotFallbackSymbols.push(holding.asset.symbol);
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
    spotFallbackSymbols,
    totalValue: resolvedTotalValue,
    totalCost: resolvedTotalCost,
    totalPnl,
    totalPnlPct,
    totalDayChange: resolvedTotalDayChange,
    datedFxComplete,
  };
}

/** Projects holdings into base-currency values so allocation views match portfolio totals verbatim. */
export function holdingsInBaseCurrency(
  holdings: readonly Holding[],
  summary: PortfolioBaseCurrencySummary,
): Holding[] {
  return holdings.map((holding) => {
    const metrics = summary.byAssetId.get(holding.asset.id);
    if (!metrics) return holding;
    return {
      ...holding,
      value: metrics.value,
      costBasis: metrics.costBasis,
      avgCost: metrics.avgCost,
      pnl: metrics.pnl,
      pnlPct: metrics.pnlPct,
      dayChange: metrics.dayChange,
    };
  });
}

export interface BaseCurrencyRealizedSale {
  assetId: string;
  date: string;
  acquiredDate: string;
  quantity: number;
  proceeds: number;
  cost: number;
  fee: number;
  gain: number;
  fxComplete: boolean;
  missingFxDates: string[];
}

export interface BaseCurrencyTaxYear {
  year: number;
  yearEnd: number;
  realized: number;
  proceeds: number;
  cost: number;
  dividends: number;
  fxComplete: boolean;
  dividendsFxComplete: boolean;
  missingFxDates: string[];
  sales: BaseCurrencyRealizedSale[];
}

export interface BaseCurrencyRealizedSummary {
  currency: Currency;
  years: BaseCurrencyTaxYear[];
  totalRealized: number;
  totalProceeds: number;
  totalCost: number;
  totalDividends: number;
  salesCount: number;
  fxComplete: boolean;
  dividendsFxComplete: boolean;
  method: RealizedFxMethod;
  missingFxDates: string[];
}

/**
 * Computes FIFO realized gains and dividends in the selected reporting currency.
 * In EUR mode, each acquisition lot, disposal, and dividend uses dated historical EURUSD=X;
 * if any required historical rate is missing, realized figures are withheld (NaN) rather than
 * approximated with today's spot FX.
 */
export function computeBaseCurrencyRealizedReport(
  transactions: readonly Transaction[],
  currency: Currency,
  options?: {
    taxYearStartMonth?: number | undefined;
    eurUsdPrices?: readonly DailyPrice[] | undefined;
    splits?: readonly CorporateAction[] | undefined;
  },
): BaseCurrencyRealizedSummary {
  const taxYearStartMonth = options?.taxYearStartMonth ?? 1;
  if (!Number.isInteger(taxYearStartMonth) || taxYearStartMonth < 1 || taxYearStartMonth > 12) {
    throw new Error("Tax year start month must be between 1 and 12");
  }

  const splits = options?.splits ?? [];
  const priceList = orderedDailyPrices(options?.eurUsdPrices);
  const sorted = normalizeTransactionsForSplits([...transactions], [...splits]).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const rateAt = (date: string): number | null => {
    if (currency === "USD") return 1;
    if (!priceList.length) return null;
    const rate = currencyRate("EUR", date, priceList, []);
    return rate !== null && rate > 0 ? rate : null;
  };

  const lots = new Map<
    string,
    { qty: number; costPerUnit: number; date: string; fxMissing: boolean }[]
  >();
  const years = new Map<number, BaseCurrencyTaxYear>();
  const portfolioMissingDates = new Set<string>();
  let salesCount = 0;

  const yearOf = (d: string): BaseCurrencyTaxYear => {
    const calendarYear = Number(d.slice(0, 4));
    const month = Number(d.slice(5, 7));
    const y = month < taxYearStartMonth ? calendarYear - 1 : calendarYear;
    let r = years.get(y);
    if (!r) {
      r = {
        year: y,
        yearEnd: taxYearStartMonth === 1 ? y : y + 1,
        realized: 0,
        proceeds: 0,
        cost: 0,
        dividends: 0,
        fxComplete: true,
        dividendsFxComplete: true,
        missingFxDates: [],
        sales: [],
      };
      years.set(y, r);
    }
    return r;
  };

  for (const t of sorted) {
    if (t.kind === "dividend") {
      const netUsd = t.quantity * t.price - (t.fee ?? 0);
      const y = yearOf(t.date);
      const divRate = rateAt(t.date);
      if (divRate === null) {
        y.dividendsFxComplete = false;
        y.dividends = Number.NaN;
        if (!y.missingFxDates.includes(t.date)) y.missingFxDates.push(t.date);
        portfolioMissingDates.add(t.date);
      } else if (y.dividendsFxComplete) {
        y.dividends += netUsd / divRate;
      }
      continue;
    }

    if (!(t.quantity > 0)) continue;
    const queue = lots.get(t.assetId) ?? [];
    lots.set(t.assetId, queue);

    if (t.kind === "buy") {
      const buyRate = rateAt(t.date);
      queue.push({
        qty: t.quantity,
        costPerUnit:
          buyRate !== null
            ? (t.quantity * t.price + (t.fee ?? 0)) / (t.quantity * buyRate)
            : Number.NaN,
        date: t.date,
        fxMissing: buyRate === null,
      });
      continue;
    }

    let left = t.quantity;
    let cost = 0;
    let matched = 0;
    const acquiredDates: string[] = [];
    const saleMissingDates: string[] = [];

    while (left > 1e-12 && queue.length) {
      const lot = queue[0]!;
      const take = Math.min(lot.qty, left);
      if (lot.fxMissing) {
        if (!saleMissingDates.includes(lot.date)) saleMissingDates.push(lot.date);
      } else {
        cost += take * lot.costPerUnit;
      }
      matched += take;
      if (!acquiredDates.includes(lot.date)) acquiredDates.push(lot.date);
      lot.qty -= take;
      left -= take;
      if (lot.qty <= 1e-12) queue.shift();
    }
    if (matched <= 0) continue;

    salesCount += 1;
    const sellRate = rateAt(t.date);
    if (sellRate === null && !saleMissingDates.includes(t.date)) {
      saleMissingDates.push(t.date);
    }

    const acquiredDate =
      acquiredDates.length <= 1
        ? (acquiredDates[0] ?? t.date)
        : `${acquiredDates[0]} – ${acquiredDates[acquiredDates.length - 1]}`;
    const y = yearOf(t.date);

    if (saleMissingDates.length > 0 || sellRate === null) {
      y.fxComplete = false;
      y.realized = Number.NaN;
      y.proceeds = Number.NaN;
      y.cost = Number.NaN;
      for (const md of saleMissingDates) {
        if (!y.missingFxDates.includes(md)) y.missingFxDates.push(md);
        portfolioMissingDates.add(md);
      }
      y.sales.push({
        assetId: t.assetId,
        date: t.date,
        acquiredDate,
        quantity: matched,
        proceeds: Number.NaN,
        cost: Number.NaN,
        fee: Number.NaN,
        gain: Number.NaN,
        fxComplete: false,
        missingFxDates: [...saleMissingDates],
      });
      continue;
    }

    const saleFee = ((t.fee ?? 0) * (matched / t.quantity)) / sellRate;
    const proceeds = (matched * t.price) / sellRate - saleFee;
    const gain = proceeds - cost;
    y.sales.push({
      assetId: t.assetId,
      date: t.date,
      acquiredDate,
      quantity: matched,
      proceeds,
      cost,
      fee: saleFee,
      gain,
      fxComplete: true,
      missingFxDates: [],
    });
    if (y.fxComplete) {
      y.realized += gain;
      y.proceeds += proceeds;
      y.cost += cost;
    }
  }

  const sortedYears = [...years.values()].sort((a, b) => b.year - a.year);
  const fxComplete = sortedYears.every((y) => y.fxComplete);
  const dividendsFxComplete = sortedYears.every((y) => y.dividendsFxComplete);
  const totalDividends = dividendsFxComplete
    ? sortedYears.reduce((sum, y) => sum + y.dividends, 0)
    : Number.NaN;

  if (salesCount === 0) {
    return {
      currency,
      years: sortedYears,
      totalRealized: 0,
      totalProceeds: 0,
      totalCost: 0,
      totalDividends,
      salesCount: 0,
      fxComplete: true,
      dividendsFxComplete,
      method: "no-sales",
      missingFxDates: [...portfolioMissingDates].sort(),
    };
  }

  if (!fxComplete) {
    return {
      currency,
      years: sortedYears,
      totalRealized: Number.NaN,
      totalProceeds: Number.NaN,
      totalCost: Number.NaN,
      totalDividends,
      salesCount,
      fxComplete: false,
      dividendsFxComplete,
      method: "missing-historical-fx",
      missingFxDates: [...portfolioMissingDates].sort(),
    };
  }

  return {
    currency,
    years: sortedYears,
    totalRealized: sortedYears.reduce((sum, y) => sum + y.realized, 0),
    totalProceeds: sortedYears.reduce((sum, y) => sum + y.proceeds, 0),
    totalCost: sortedYears.reduce((sum, y) => sum + y.cost, 0),
    totalDividends,
    salesCount,
    fxComplete: true,
    dividendsFxComplete,
    method: currency === "USD" ? "usd-stored" : "dated-historical-fx",
    missingFxDates: [...portfolioMissingDates].sort(),
  };
}

export function transactionCashFlowUsd(
  tx: Pick<Transaction, "kind" | "quantity" | "price" | "fee">,
): number {
  const fee = tx.fee ?? 0;
  return tx.kind === "buy" ? tx.quantity * tx.price + fee : tx.quantity * tx.price - fee;
}

export interface HistoricalAmountResult {
  amount: number;
  currency: Currency;
  method: HistoricalAmountMethod;
  fxRate: number | null;
}

/**
 * Converts a historical USD-stored amount into the reporting currency using dated EURUSD=X.
 * Under the conservative policy, missing EUR historical FX falls back to displaying the actual
 * stored USD amount explicitly in USD rather than fabricating a historical EUR figure with spot FX.
 */
export function convertHistoricalUsdAmount(
  usdAmount: number,
  date: string,
  targetCurrency: Currency,
  eurUsdPrices?: readonly DailyPrice[],
): HistoricalAmountResult {
  if (!Number.isFinite(usdAmount)) {
    return {
      amount: Number.NaN,
      currency: targetCurrency,
      method: targetCurrency === "USD" ? "usd-stored" : "usd-fallback-missing-fx",
      fxRate: null,
    };
  }
  if (targetCurrency === "USD") {
    return { amount: usdAmount, currency: "USD", method: "usd-stored", fxRate: 1 };
  }
  if (eurUsdPrices?.length) {
    const rate = currencyRate("EUR", date, orderedDailyPrices(eurUsdPrices), []);
    if (rate !== null && rate > 0) {
      return {
        amount: usdAmount / rate,
        currency: "EUR",
        method: "dated-historical-fx",
        fxRate: rate,
      };
    }
  }
  return {
    amount: usdAmount,
    currency: "USD",
    method: "usd-fallback-missing-fx",
    fxRate: null,
  };
}

export function formatHistoricalUsdAmount(
  usdAmount: number,
  date: string,
  targetCurrency: Currency,
  eurUsdPrices: readonly DailyPrice[] | undefined,
  lang: Lang,
  opts?: { sign?: boolean; compact?: boolean },
): string {
  const converted = convertHistoricalUsdAmount(usdAmount, date, targetCurrency, eurUsdPrices);
  return formatBaseCurrencyAmount(converted.amount, converted.currency, lang, opts);
}

export interface BaseCurrencyAssetActivity {
  currency: Currency;
  bought: number;
  sold: number;
  dividends: number;
  boughtFxComplete: boolean;
  soldFxComplete: boolean;
  dividendsFxComplete: boolean;
  firstDate: string | null;
}

export function computeAssetActivitySummary(
  transactions: readonly Transaction[],
  assetId: string,
  currency: Currency,
  eurUsdPrices?: readonly DailyPrice[],
): BaseCurrencyAssetActivity {
  const own = transactions.filter((t) => t.assetId === assetId);
  const priceList = orderedDailyPrices(eurUsdPrices);
  let bought = 0;
  let sold = 0;
  let dividends = 0;
  let boughtFxComplete = true;
  let soldFxComplete = true;
  let dividendsFxComplete = true;
  let firstDate: string | null = null;

  for (const t of own) {
    if (!firstDate || t.date < firstDate) firstDate = t.date;
    const cashUsd = transactionCashFlowUsd(t);
    const rate =
      currency === "USD" ? 1 : priceList.length ? currencyRate("EUR", t.date, priceList, []) : null;
    const validRate = rate !== null && rate > 0 ? rate : null;

    if (t.kind === "buy") {
      if (validRate === null) {
        boughtFxComplete = false;
        bought = Number.NaN;
      } else if (boughtFxComplete) {
        bought += cashUsd / validRate;
      }
    } else if (t.kind === "sell") {
      if (validRate === null) {
        soldFxComplete = false;
        sold = Number.NaN;
      } else if (soldFxComplete) {
        sold += cashUsd / validRate;
      }
    } else {
      if (validRate === null) {
        dividendsFxComplete = false;
        dividends = Number.NaN;
      } else if (dividendsFxComplete) {
        dividends += cashUsd / validRate;
      }
    }
  }

  return {
    currency,
    bought,
    sold,
    dividends,
    boughtFxComplete,
    soldFxComplete,
    dividendsFxComplete,
    firstDate,
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
