import { describe, expect, it } from "vitest";
import {
  computeAssetActivitySummary,
  computeBaseCurrencyRealizedReport,
  computeHoldingBaseMetrics,
  computePortfolioBaseMetrics,
  convertHistoricalUsdAmount,
  formatBaseCurrencyAmount,
  formatHistoricalUsdAmount,
  holdingsInBaseCurrency,
  transactionCashFlowUsd,
} from "@/lib/base-currency-accounting";
import {
  analyzeBrokerCsv,
  existingImportTransactions,
  prepareCsvText,
  splitDuplicates,
} from "@/lib/csv-import";
import type { DailyPrice } from "@/lib/history";
import { resolveAssetIdentity } from "@/lib/instrument-identity";
import { calculatePortfolioInvestmentFocus } from "@/lib/investment-focus";
import {
  brokerHoldings,
  computeHoldings,
  groupBy,
  type Asset,
  type Transaction,
} from "@/lib/portfolio";
import { fifoTaxReport } from "@/lib/tools";

const T212_HEADER =
  "Action,Time (UTC),ISIN,Ticker,Name,Notes,ID,No. of shares,Price / share,Currency (Price / share),Exchange rate,Total,Currency (Total),Merchant name,Merchant category";

function makeDailyPrices(entries: Array<[string, number]>): DailyPrice[] {
  return [...entries]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, close]) => ({
      t: Date.parse(`${date}T00:00:00Z`),
      date,
      close,
    }));
}

const SYNTHETIC_13_TRADES_EUR_DATES: Array<{
  id: string;
  symbol: "VXUS" | "SPYL";
  date: string;
  quantity: number;
  eurTotal: number;
  fxClose: number;
}> = [
  { id: "B1", symbol: "VXUS", date: "2026-09-07", quantity: 5.0, eurTotal: 21.35, fxClose: 1.112 },
  { id: "B2", symbol: "VXUS", date: "2026-09-21", quantity: 4.5, eurTotal: 19.22, fxClose: 1.118 },
  { id: "B3", symbol: "VXUS", date: "2026-10-05", quantity: 3.75, eurTotal: 16.01, fxClose: 1.124 },
  { id: "B4", symbol: "VXUS", date: "2026-10-19", quantity: 4.25, eurTotal: 18.15, fxClose: 1.132 },
  {
    id: "B5",
    symbol: "VXUS",
    date: "2026-11-02",
    quantity: 3.24030804,
    eurTotal: 13.85,
    fxClose: 1.148,
  },
  { id: "B6", symbol: "SPYL", date: "2026-09-07", quantity: 2.0, eurTotal: 33.76, fxClose: 1.112 },
  { id: "B7", symbol: "SPYL", date: "2026-09-14", quantity: 1.8, eurTotal: 30.38, fxClose: 1.115 },
  { id: "B8", symbol: "SPYL", date: "2026-09-28", quantity: 2.2, eurTotal: 37.13, fxClose: 1.121 },
  { id: "B9", symbol: "SPYL", date: "2026-10-01", quantity: 1.75, eurTotal: 29.54, fxClose: 1.123 },
  { id: "B10", symbol: "SPYL", date: "2026-10-12", quantity: 2.1, eurTotal: 35.45, fxClose: 1.129 },
  { id: "B11", symbol: "SPYL", date: "2026-10-26", quantity: 1.9, eurTotal: 32.07, fxClose: 1.141 },
  { id: "B12", symbol: "SPYL", date: "2026-11-02", quantity: 1.6, eurTotal: 27.0, fxClose: 1.148 },
  {
    id: "B13",
    symbol: "SPYL",
    date: "2026-11-09",
    quantity: 1.56826222,
    eurTotal: 26.47,
    fxClose: 1.158,
  },
];

describe("Issue 1 — Cross-page parity (Holdings, Dashboard, Allocation, Analytics, Asset Detail)", () => {
  it("produces 0.00 cent divergence across all surfaces in EUR and USD on identical quote & FX snapshots", () => {
    const eurUsdPrices = makeDailyPrices([
      ["2026-09-07", 1.112],
      ["2026-09-14", 1.115],
      ["2026-09-21", 1.118],
      ["2026-09-28", 1.121],
      ["2026-10-01", 1.123],
      ["2026-10-05", 1.124],
      ["2026-10-12", 1.129],
      ["2026-10-19", 1.132],
      ["2026-10-26", 1.141],
      ["2026-11-02", 1.148],
      ["2026-11-09", 1.158],
    ]);

    // Simulated quote timestamp fixed across Holdings, Dashboard, Analytics & Asset Detail
    const quoteAt = "2026-11-20T13:45:00Z";
    const quoteEurUsd = 1.158;
    const assets: Asset[] = [
      {
        id: "vxus-id",
        symbol: "VXUS.DE",
        name: "Vanguard FTSE All-World ex-US UCITS ETF",
        type: "etf",
        sector: "Broad Market",
        region: "Global",
        isin: "IE0009A5ADV9",
        quoteSymbol: "VXUS.DE",
        quoteCurrency: "EUR",
        quoteNativePrice: 4.04,
        price: 4.04 * quoteEurUsd,
        change24h: -0.98,
        quoteAt,
        dividendPerShare: 0,
        payMonths: [],
      },
      {
        id: "spyl-id",
        symbol: "SPYL.DE",
        name: "SPDR S&P 500 UCITS ETF (Acc)",
        type: "etf",
        sector: "Broad Market",
        region: "North America",
        isin: "IE000XZSV718",
        quoteSymbol: "SPYL.DE",
        quoteCurrency: "EUR",
        quoteNativePrice: 16.08,
        price: 16.08 * quoteEurUsd,
        change24h: -2.49,
        quoteAt,
        dividendPerShare: 0,
        payMonths: [],
      },
      {
        id: "aapl-id",
        symbol: "AAPL",
        name: "Apple Inc.",
        type: "stock",
        sector: "Technology",
        region: "North America",
        quoteCurrency: "USD",
        price: 225.0,
        change24h: 0.75,
        quoteAt,
        dividendPerShare: 0,
        payMonths: [],
      },
    ];

    const txs: Transaction[] = [
      ...SYNTHETIC_13_TRADES_EUR_DATES.map((t) => ({
        id: t.id,
        assetId: t.symbol === "VXUS" ? "vxus-id" : "spyl-id",
        brokerId: "t212",
        kind: "buy" as const,
        quantity: t.quantity,
        price: (t.eurTotal * t.fxClose) / t.quantity,
        fee: 0,
        date: t.date,
      })),
      {
        id: "aapl-b1",
        assetId: "aapl-id",
        brokerId: "t212",
        kind: "buy",
        quantity: 2,
        price: 112.4, // 2 * 112.40 + 0 = $224.80 -> €200.00 @ 1.124
        fee: 0,
        date: "2026-10-05",
      },
    ];

    const holdings = computeHoldings(assets, txs);
    // Deliberately shift liveEurPerUsd slightly from quoteEurUsd (as live FX updates independently of cached EUR quotes)
    const liveEurPerUsd = 1 / 1.155;

    for (const currency of ["EUR", "USD"] as const) {
      const holdingsSummary = computePortfolioBaseMetrics(holdings, txs, currency, {
        liveEurPerUsd,
        eurUsdPrices,
      });
      // Dashboard consumes the exact same computePortfolioBaseMetrics call
      const dashboardSummary = computePortfolioBaseMetrics(holdings, txs, currency, {
        liveEurPerUsd,
        eurUsdPrices,
      });
      // AllocationCard & Analytics project holdings via holdingsInBaseCurrency
      const projectedHoldings = holdingsInBaseCurrency(holdings, dashboardSummary);
      const allocationByClass = groupBy(projectedHoldings, (h) => h.asset.type);
      const allocationTotal = allocationByClass.reduce((sum, row) => sum + row.value, 0);
      const focusSummary = calculatePortfolioInvestmentFocus(projectedHoldings);
      const analyticsContribTotal = projectedHoldings.reduce(
        (sum, h) => sum + (dashboardSummary.byAssetId.get(h.asset.id)?.pnl ?? 0),
        0,
      );
      const bh = brokerHoldings(assets, txs, [], []);
      const accountTotal = bh.reduce((sum, item) => {
        const m = dashboardSummary.byAssetId.get(item.asset.id)!;
        return sum + (item.quantity / m.quantity) * m.value;
      }, 0);

      // Asset Detail sums individual computeHoldingBaseMetrics
      let assetDetailValueSum = 0;
      let assetDetailCostSum = 0;
      let assetDetailPnlSum = 0;
      for (const h of holdings) {
        const single = computeHoldingBaseMetrics(h, txs, currency, {
          liveEurPerUsd,
          eurUsdPrices,
        });
        const fromMap = dashboardSummary.byAssetId.get(h.asset.id)!;
        expect(single.value).toBeCloseTo(fromMap.value, 12);
        expect(single.costBasis).toBeCloseTo(fromMap.costBasis, 12);
        expect(single.avgCost).toBeCloseTo(fromMap.avgCost, 12);
        expect(single.pnl).toBeCloseTo(fromMap.pnl, 12);
        expect(single.pnlPct).toBeCloseTo(fromMap.pnlPct, 12);
        assetDetailValueSum += single.value;
        assetDetailCostSum += single.costBasis;
        assetDetailPnlSum += single.pnl;
      }

      // Exact displayed-cent parity across all 5 surfaces
      const dispHoldingsVal = formatBaseCurrencyAmount(holdingsSummary.totalValue, currency, "en");
      const dispDashVal = formatBaseCurrencyAmount(dashboardSummary.totalValue, currency, "en");
      const dispAllocVal = formatBaseCurrencyAmount(allocationTotal, currency, "en");
      const dispFocusVal = formatBaseCurrencyAmount(focusSummary.totalValue, currency, "en");
      const dispAccountVal = formatBaseCurrencyAmount(accountTotal, currency, "en");
      const dispAssetDetailSum = formatBaseCurrencyAmount(assetDetailValueSum, currency, "en");

      expect(dispDashVal).toBe(dispHoldingsVal);
      expect(dispAllocVal).toBe(dispHoldingsVal);
      expect(dispFocusVal).toBe(dispHoldingsVal);
      expect(dispAccountVal).toBe(dispHoldingsVal);
      expect(dispAssetDetailSum).toBe(dispHoldingsVal);

      expect(formatBaseCurrencyAmount(dashboardSummary.totalCost, currency, "en")).toBe(
        formatBaseCurrencyAmount(assetDetailCostSum, currency, "en"),
      );
      expect(formatBaseCurrencyAmount(dashboardSummary.totalPnl, currency, "en")).toBe(
        formatBaseCurrencyAmount(analyticsContribTotal, currency, "en"),
      );
      expect(formatBaseCurrencyAmount(dashboardSummary.totalPnl, currency, "en")).toBe(
        formatBaseCurrencyAmount(assetDetailPnlSum, currency, "en"),
      );
      expect(Math.abs(holdingsSummary.totalValue - allocationTotal)).toBeLessThan(1e-10);
      expect(Math.abs(holdingsSummary.totalPnl - analyticsContribTotal)).toBeLessThan(1e-10);
    }
  });

  it("enforces single unrounded summation convention & missing-price suppression consistently", () => {
    // 100.004 + 100.004 = 200.008 -> rounds ONCE at display time to €200.01 (not €200.00)
    const assets: Asset[] = [
      {
        id: "a1",
        symbol: "A1.DE",
        name: "ETF A1",
        type: "etf",
        sector: "Other",
        region: "Global",
        quoteCurrency: "EUR",
        quoteNativePrice: 100.004,
        price: 115,
        change24h: 0,
        dividendPerShare: 0,
        payMonths: [],
      },
      {
        id: "a2",
        symbol: "A2.DE",
        name: "ETF A2",
        type: "etf",
        sector: "Other",
        region: "Global",
        quoteCurrency: "EUR",
        quoteNativePrice: 100.004,
        price: 115,
        change24h: 0,
        dividendPerShare: 0,
        payMonths: [],
      },
    ];
    const txs: Transaction[] = [
      { id: "t1", assetId: "a1", kind: "buy", quantity: 1, price: 115, fee: 0, date: "2026-10-01" },
      { id: "t2", assetId: "a2", kind: "buy", quantity: 1, price: 115, fee: 0, date: "2026-10-01" },
    ];
    const summary = computePortfolioBaseMetrics(computeHoldings(assets, txs), txs, "EUR", {
      liveEurPerUsd: 1 / 1.15,
      eurUsdPrices: makeDailyPrices([["2026-10-01", 1.15]]),
    });
    expect(formatBaseCurrencyAmount(summary.totalValue, "EUR", "en")).toBe("€200.01");

    // Missing price on A2 suppresses totalValue, totalPnl, totalDayChange across Holdings/Dashboard
    const unpricedAssets: Asset[] = [
      assets[0]!,
      { ...assets[1]!, quoteNativePrice: Number.NaN, price: Number.NaN },
    ];
    const partial = computePortfolioBaseMetrics(computeHoldings(unpricedAssets, txs), txs, "EUR", {
      liveEurPerUsd: 1 / 1.15,
      eurUsdPrices: makeDailyPrices([["2026-10-01", 1.15]]),
    });
    expect(partial.isComplete).toBe(false);
    expect(partial.missingQuoteSymbols).toEqual(["A2.DE"]);
    expect(Number.isNaN(partial.totalValue)).toBe(true);
    expect(Number.isNaN(partial.totalPnl)).toBe(true);
    expect(Number.isNaN(partial.totalDayChange)).toBe(true);
    expect(partial.totalCost).toBeCloseTo(200, 6);
    expect(formatBaseCurrencyAmount(partial.totalValue, "EUR", "en")).toBe("—");
  });
});

describe("Issue 2 — Realized P&L currency correctness & FIFO lot accounting (9 required scenarios)", () => {
  it("1. EUR buy -> EUR sell preserves true EUR economics (no fake FX profit)", () => {
    const eurUsdPrices = makeDailyPrices([
      ["2026-09-01", 1.0],
      ["2026-10-01", 1.2],
      ["2026-09-10", 1.08],
      ["2026-10-15", 1.15],
    ]);
    // Break-even EUR trade: buy 10 @ €10 (€100, stored $100 @ 1.00), sell 10 @ €10 (€100, stored $120 @ 1.20)
    const breakEvenTxs: Transaction[] = [
      {
        id: "b1",
        assetId: "etf1",
        kind: "buy",
        quantity: 10,
        price: 10,
        fee: 0,
        date: "2026-09-01",
      },
      {
        id: "s1",
        assetId: "etf1",
        kind: "sell",
        quantity: 10,
        price: 12,
        fee: 0,
        date: "2026-10-01",
      },
    ];
    // Raw USD FIFO would show +$20 USD, which multiplying by spot EURUSD would distort!
    expect(fifoTaxReport(breakEvenTxs)[0]!.realized).toBeCloseTo(20, 6);
    const eurReport = computeBaseCurrencyRealizedReport(breakEvenTxs, "EUR", { eurUsdPrices });
    expect(eurReport.fxComplete).toBe(true);
    expect(eurReport.method).toBe("dated-historical-fx");
    expect(eurReport.totalProceeds).toBeCloseTo(100, 6);
    expect(eurReport.totalCost).toBeCloseTo(100, 6);
    expect(eurReport.totalRealized).toBeCloseTo(0, 6);

    // Profitable EUR trade: buy 5 @ €20 (€100 @ 1.08 -> $108), sell 5 @ €27 (€135 @ 1.15 -> $155.25)
    const profitTxs: Transaction[] = [
      {
        id: "b2",
        assetId: "etf2",
        kind: "buy",
        quantity: 5,
        price: 21.6,
        fee: 0,
        date: "2026-09-10",
      },
      {
        id: "s2",
        assetId: "etf2",
        kind: "sell",
        quantity: 5,
        price: 31.05,
        fee: 0,
        date: "2026-10-15",
      },
    ];
    const profitReport = computeBaseCurrencyRealizedReport(profitTxs, "EUR", { eurUsdPrices });
    expect(profitReport.totalCost).toBeCloseTo(100, 6);
    expect(profitReport.totalProceeds).toBeCloseTo(135, 6);
    expect(profitReport.totalRealized).toBeCloseTo(35, 6);
  });

  it("2. USD buy -> USD sell in EUR reporting mode captures realized FX gain/loss", () => {
    const eurUsdPrices = makeDailyPrices([
      ["2026-09-01", 1.0],
      ["2026-10-01", 1.25],
    ]);
    // Flat $100 -> $100 USD trade, while EUR strengthens from 1.00 to 1.25 (-€20 EUR loss)
    const txs: Transaction[] = [
      {
        id: "b1",
        assetId: "us1",
        kind: "buy",
        quantity: 10,
        price: 10,
        fee: 0,
        date: "2026-09-01",
      },
      {
        id: "s1",
        assetId: "us1",
        kind: "sell",
        quantity: 10,
        price: 10,
        fee: 0,
        date: "2026-10-01",
      },
    ];
    const usdReport = computeBaseCurrencyRealizedReport(txs, "USD", { eurUsdPrices });
    expect(usdReport.totalRealized).toBeCloseTo(0, 6);
    expect(usdReport.method).toBe("usd-stored");

    const eurReport = computeBaseCurrencyRealizedReport(txs, "EUR", { eurUsdPrices });
    expect(eurReport.totalCost).toBeCloseTo(100, 6);
    expect(eurReport.totalProceeds).toBeCloseTo(80, 6);
    expect(eurReport.totalRealized).toBeCloseTo(-20, 6);
  });

  it("3. Multiple buys at different historical FX rates consume oldest FIFO lot FX first", () => {
    const eurUsdPrices = makeDailyPrices([
      ["2026-09-01", 1.0],
      ["2026-10-01", 1.25],
      ["2026-11-01", 1.1],
    ]);
    // Lot 1: 10 @ $10 (€100 / €10 each); Lot 2: 10 @ $10 (€80 / €8 each); Sell 10 @ $11 (€100 proceeds)
    const txs: Transaction[] = [
      { id: "b1", assetId: "a", kind: "buy", quantity: 10, price: 10, fee: 0, date: "2026-09-01" },
      { id: "b2", assetId: "a", kind: "buy", quantity: 10, price: 10, fee: 0, date: "2026-10-01" },
      { id: "s1", assetId: "a", kind: "sell", quantity: 10, price: 11, fee: 0, date: "2026-11-01" },
    ];
    const eurReport = computeBaseCurrencyRealizedReport(txs, "EUR", { eurUsdPrices });
    // Strict FIFO consumes Lot 1 (€100 cost), NOT average (€90)!
    expect(eurReport.totalCost).toBeCloseTo(100, 6);
    expect(eurReport.totalProceeds).toBeCloseTo(100, 6);
    expect(eurReport.totalRealized).toBeCloseTo(0, 6);
    expect(eurReport.years[0]!.sales[0]!.acquiredDate).toBe("2026-09-01");
  });

  it("4. Partial sale reconciles realized vs remaining cost basis without double counting", () => {
    const eurUsdPrices = makeDailyPrices([
      ["2026-09-01", 1.1],
      ["2026-10-15", 1.15],
    ]);
    // Buy 10 shares @ €10 (€100 = $110 @ 1.10); Sell 4 @ €15 (€60 = $69 @ 1.15)
    // Open position now 6 shares priced at €18 -> €108 market value
    const asset: Asset = {
      id: "etf1",
      symbol: "EUNL.DE",
      name: "iShares Core MSCI World UCITS ETF",
      type: "etf",
      sector: "Broad Market",
      region: "Global",
      quoteCurrency: "EUR",
      quoteNativePrice: 18,
      price: 18 * 1.15,
      change24h: 0,
      dividendPerShare: 0,
      payMonths: [],
    };
    const txs: Transaction[] = [
      {
        id: "b1",
        assetId: "etf1",
        kind: "buy",
        quantity: 10,
        price: 11,
        fee: 0,
        date: "2026-09-01",
      },
      {
        id: "s1",
        assetId: "etf1",
        kind: "sell",
        quantity: 4,
        price: 17.25,
        fee: 0,
        date: "2026-10-15",
      },
    ];
    const realized = computeBaseCurrencyRealizedReport(txs, "EUR", { eurUsdPrices });
    const portfolio = computePortfolioBaseMetrics(computeHoldings([asset], txs), txs, "EUR", {
      liveEurPerUsd: 1 / 1.15,
      eurUsdPrices,
    });

    expect(realized.totalProceeds).toBeCloseTo(60, 6);
    expect(realized.totalCost).toBeCloseTo(40, 6);
    expect(realized.totalRealized).toBeCloseTo(20, 6);
    expect(portfolio.totalCost).toBeCloseTo(60, 6); // remaining open cost basis
    expect(portfolio.totalValue).toBeCloseTo(108, 6);
    expect(portfolio.totalPnl).toBeCloseTo(48, 6); // unrealized on open 6 shares only
    // Total wealth identity: Proceeds(60) + Value(108) - OriginalBuy(100) == Realized(20) + Unrealized(48)
    expect(realized.totalRealized + portfolio.totalPnl).toBeCloseTo(60 + 108 - 100, 6);
  });

  it("5. Multiple sales respect taxYearStartMonth (calendar vs April tax year)", () => {
    const eurUsdPrices = makeDailyPrices([
      ["2026-01-10", 1.1],
      ["2026-02-15", 1.1],
      ["2026-06-15", 1.1],
      ["2026-11-05", 1.1],
    ]);
    const txs: Transaction[] = [
      { id: "b1", assetId: "a", kind: "buy", quantity: 30, price: 11, fee: 0, date: "2026-01-10" }, // €10/sh
      {
        id: "s1",
        assetId: "a",
        kind: "sell",
        quantity: 10,
        price: 13.2,
        fee: 0,
        date: "2026-02-15",
      }, // €12 -> +€20
      {
        id: "s2",
        assetId: "a",
        kind: "sell",
        quantity: 10,
        price: 14.3,
        fee: 0,
        date: "2026-06-15",
      }, // €13 -> +€30
      {
        id: "s3",
        assetId: "a",
        kind: "sell",
        quantity: 10,
        price: 15.4,
        fee: 0,
        date: "2026-11-05",
      }, // €14 -> +€40
    ];

    const calendar = computeBaseCurrencyRealizedReport(txs, "EUR", {
      taxYearStartMonth: 1,
      eurUsdPrices,
    });
    expect(calendar.years.map((y) => [y.year, y.yearEnd])).toEqual([[2026, 2026]]);
    expect(calendar.totalRealized).toBeCloseTo(90, 6);

    const ukFiscal = computeBaseCurrencyRealizedReport(txs, "EUR", {
      taxYearStartMonth: 4,
      eurUsdPrices,
    });
    expect(ukFiscal.years.map((y) => [y.year, y.yearEnd])).toEqual([
      [2026, 2027],
      [2025, 2026],
    ]);
    expect(ukFiscal.years[0]!.realized).toBeCloseTo(70, 6);
    expect(ukFiscal.years[1]!.realized).toBeCloseTo(20, 6);
    expect(ukFiscal.totalRealized).toBeCloseTo(90, 6);
  });

  it("6. Handles buy fees and sell fees at each transaction's trade-date FX rate", () => {
    const eurUsdPrices = makeDailyPrices([
      ["2026-09-01", 1.1],
      ["2026-10-01", 1.2],
    ]);
    // Buy 10 @ $20 + $2.20 fee @ 1.10 -> €183.818181... cost basis (€18.381818.../sh)
    // Sell 5 @ $24 - $1.20 fee @ 1.20 -> (€120 - €1.00) / 1.20 = €100 - €1 = €99.00 proceeds
    const txs: Transaction[] = [
      {
        id: "b1",
        assetId: "a",
        kind: "buy",
        quantity: 10,
        price: 20,
        fee: 2.2,
        date: "2026-09-01",
      },
      {
        id: "s1",
        assetId: "a",
        kind: "sell",
        quantity: 5,
        price: 24,
        fee: 1.2,
        date: "2026-10-01",
      },
    ];
    const eurReport = computeBaseCurrencyRealizedReport(txs, "EUR", { eurUsdPrices });
    const expectedCost = 5 * ((10 * 20 + 2.2) / (10 * 1.1));
    const expectedProceeds = (5 * 24 - 1.2) / 1.2;
    expect(eurReport.totalCost).toBeCloseTo(expectedCost, 6);
    expect(eurReport.totalProceeds).toBeCloseTo(expectedProceeds, 6);
    expect(eurReport.totalRealized).toBeCloseTo(expectedProceeds - expectedCost, 6);
  });

  it("7. Reflects FX direction symmetrically (EUR strengthening vs EUR weakening)", () => {
    const buySellTxs: Transaction[] = [
      { id: "b", assetId: "us", kind: "buy", quantity: 1, price: 100, fee: 0, date: "2026-09-01" },
      { id: "s", assetId: "us", kind: "sell", quantity: 1, price: 110, fee: 0, date: "2026-10-01" },
    ];
    // EUR strengthens 1.00 -> 1.20: USD +$10 turns into EUR loss €91.67 - €100 = -€8.33
    const eurStrong = computeBaseCurrencyRealizedReport(buySellTxs, "EUR", {
      eurUsdPrices: makeDailyPrices([
        ["2026-09-01", 1.0],
        ["2026-10-01", 1.2],
      ]),
    });
    expect(eurStrong.totalRealized).toBeCloseTo(110 / 1.2 - 100, 6);
    expect(eurStrong.totalRealized).toBeLessThan(0);

    // EUR weakens 1.20 -> 1.00: USD +$10 expands to €110 - €83.33 = +€26.67
    const eurWeak = computeBaseCurrencyRealizedReport(buySellTxs, "EUR", {
      eurUsdPrices: makeDailyPrices([
        ["2026-09-01", 1.2],
        ["2026-10-01", 1.0],
      ]),
    });
    expect(eurWeak.totalRealized).toBeCloseTo(110 - 100 / 1.2, 6);
    expect(eurWeak.totalRealized).toBeGreaterThan(25);
  });

  it("8. Missing historical FX on buy or sell withholds EUR realized figures (NEVER falls back to spot FX)", () => {
    const partialFx = makeDailyPrices([["2026-10-01", 1.15]]);
    // Missing buy date FX (2024-01-10 > 7 days away from 2026-10-01)
    const missingBuyFx = computeBaseCurrencyRealizedReport(
      [
        { id: "b", assetId: "a", kind: "buy", quantity: 5, price: 10, fee: 0, date: "2024-01-10" },
        { id: "s", assetId: "a", kind: "sell", quantity: 5, price: 12, fee: 0, date: "2026-10-01" },
      ],
      "EUR",
      { eurUsdPrices: partialFx },
    );
    expect(missingBuyFx.fxComplete).toBe(false);
    expect(missingBuyFx.method).toBe("missing-historical-fx");
    expect(missingBuyFx.missingFxDates).toEqual(["2024-01-10"]);
    expect(Number.isNaN(missingBuyFx.totalRealized)).toBe(true);
    expect(formatBaseCurrencyAmount(missingBuyFx.totalRealized, "EUR", "en")).toBe("—");

    // Missing sell date FX (sell after buy, >7 days beyond available FX bar)
    const missingSellFx = computeBaseCurrencyRealizedReport(
      [
        { id: "b", assetId: "a", kind: "buy", quantity: 5, price: 10, fee: 0, date: "2026-10-01" },
        { id: "s", assetId: "a", kind: "sell", quantity: 5, price: 12, fee: 0, date: "2026-11-15" },
      ],
      "EUR",
      { eurUsdPrices: partialFx },
    );
    expect(missingSellFx.fxComplete).toBe(false);
    expect(missingSellFx.missingFxDates).toEqual(["2026-11-15"]);
    expect(Number.isNaN(missingSellFx.totalRealized)).toBe(true);

    // No sales + missing dividend FX does NOT poison sales realized P&L (€0.00)
    const noSalesMissingDiv = computeBaseCurrencyRealizedReport(
      [
        { id: "b", assetId: "a", kind: "buy", quantity: 5, price: 10, fee: 0, date: "2026-10-01" },
        {
          id: "d",
          assetId: "a",
          kind: "dividend",
          quantity: 5,
          price: 0.5,
          fee: 0,
          date: "2024-02-01",
        },
      ],
      "EUR",
      { eurUsdPrices: partialFx },
    );
    expect(noSalesMissingDiv.fxComplete).toBe(true);
    expect(noSalesMissingDiv.method).toBe("no-sales");
    expect(noSalesMissingDiv.totalRealized).toBe(0);
    expect(noSalesMissingDiv.dividendsFxComplete).toBe(false);
    expect(Number.isNaN(noSalesMissingDiv.totalDividends)).toBe(true);
  });

  it("9. Mixed portfolio with open & closed positions separates realized from unrealized strictly", () => {
    const eurUsdPrices = makeDailyPrices([
      ["2026-09-01", 1.1],
      ["2026-10-01", 1.15],
      ["2026-11-01", 1.2],
    ]);
    const assets: Asset[] = [
      {
        id: "closed",
        symbol: "EUNL.DE",
        name: "Closed ETF",
        type: "etf",
        sector: "Broad Market",
        region: "Global",
        quoteCurrency: "EUR",
        quoteNativePrice: 90,
        price: 90 * 1.2,
        change24h: 0,
        dividendPerShare: 0,
        payMonths: [],
      },
      {
        id: "partial",
        symbol: "SPYL.DE",
        name: "Partial ETF",
        type: "etf",
        sector: "Broad Market",
        region: "North America",
        quoteCurrency: "EUR",
        quoteNativePrice: 18,
        price: 18 * 1.2,
        change24h: 0,
        dividendPerShare: 0,
        payMonths: [],
      },
      {
        id: "open",
        symbol: "VXUS.DE",
        name: "Open ETF",
        type: "etf",
        sector: "Broad Market",
        region: "Global",
        quoteCurrency: "EUR",
        quoteNativePrice: 5,
        price: 5 * 1.2,
        change24h: 0,
        dividendPerShare: 0,
        payMonths: [],
      },
    ];
    const txs: Transaction[] = [
      // Closed asset: buy 10 @ €80 -> sell 10 @ €95 (+€150 realized)
      {
        id: "c-b",
        assetId: "closed",
        kind: "buy",
        quantity: 10,
        price: 88,
        fee: 0,
        date: "2026-09-01",
      },
      {
        id: "c-s",
        assetId: "closed",
        kind: "sell",
        quantity: 10,
        price: 109.25,
        fee: 0,
        date: "2026-10-01",
      },
      // Partial asset: buy 10 @ €15 (€150) -> sell 4 @ €17.50 (€70 proceeds, €60 cost -> +€10 realized)
      {
        id: "p-b",
        assetId: "partial",
        kind: "buy",
        quantity: 10,
        price: 16.5,
        fee: 0,
        date: "2026-09-01",
      },
      {
        id: "p-s",
        assetId: "partial",
        kind: "sell",
        quantity: 4,
        price: 21,
        fee: 0,
        date: "2026-11-01",
      },
      // Open asset: buy 20 @ €4 (€80) -> open value 20 * €5 = €100 (+€20 unrealized)
      {
        id: "o-b",
        assetId: "open",
        kind: "buy",
        quantity: 20,
        price: 4.4,
        fee: 0,
        date: "2026-09-01",
      },
    ];
    const holdings = computeHoldings(assets, txs);
    expect(holdings.map((h) => h.asset.id).sort()).toEqual(["open", "partial"]);

    const realized = computeBaseCurrencyRealizedReport(txs, "EUR", { eurUsdPrices });
    const portfolio = computePortfolioBaseMetrics(holdings, txs, "EUR", {
      liveEurPerUsd: 1 / 1.2,
      eurUsdPrices,
    });

    expect(realized.totalRealized).toBeCloseTo(150 + 10, 6);
    expect(portfolio.totalCost).toBeCloseTo(90 + 80, 6);
    expect(portfolio.totalValue).toBeCloseTo(6 * 18 + 20 * 5, 6);
    expect(portfolio.totalPnl).toBeCloseTo(18 + 20, 6);
  });
});

describe("Issue 3 — Recent activity & historical FX display consistency", () => {
  it("computes buy/sell/multi-share dividend cash flows and uses trade-date FX or conservative USD fallback", () => {
    // Regression guard: multi-share dividend must multiply quantity * price - fee
    expect(
      transactionCashFlowUsd({ kind: "dividend", quantity: 10, price: 0.5, fee: 0.25 }),
    ).toBeCloseTo(4.75, 8);
    expect(transactionCashFlowUsd({ kind: "buy", quantity: 2, price: 50, fee: 1.5 })).toBeCloseTo(
      101.5,
      8,
    );
    expect(transactionCashFlowUsd({ kind: "sell", quantity: 2, price: 60, fee: 1.0 })).toBeCloseTo(
      119,
      8,
    );

    const eurUsdPrices = makeDailyPrices([
      ["2026-11-02", 1.148],
      ["2026-11-09", 1.158],
    ]);
    // Simulate Nov 9 SPYL buy (€26.47 @ 1.1580 = $30.65226 stored USD) displayed regardless of spot FX
    const storedNov9Usd = 26.47 * 1.158;
    const conv = convertHistoricalUsdAmount(storedNov9Usd, "2026-11-09", "EUR", eurUsdPrices);
    expect(conv.method).toBe("dated-historical-fx");
    expect(conv.currency).toBe("EUR");
    expect(conv.amount).toBeCloseTo(26.47, 6);
    expect(formatHistoricalUsdAmount(storedNov9Usd, "2026-11-09", "EUR", eurUsdPrices, "en")).toBe(
      "€26.47",
    );

    // Missing historical FX in EUR mode falls back to stored USD with '$' symbol, NEVER spot FX '€'
    const missing = convertHistoricalUsdAmount(storedNov9Usd, "2023-05-01", "EUR", eurUsdPrices);
    expect(missing.method).toBe("usd-fallback-missing-fx");
    expect(missing.currency).toBe("USD");
    expect(formatHistoricalUsdAmount(storedNov9Usd, "2023-05-01", "EUR", eurUsdPrices, "en")).toBe(
      "$30.65",
    );

    // Asset activity summary separates bought, sold, and dividends accurately in EUR & blocks missing FX
    const txs: Transaction[] = [
      {
        id: "b1",
        assetId: "a1",
        kind: "buy",
        quantity: 2,
        price: 17.37,
        fee: 0,
        date: "2026-11-09",
      },
      {
        id: "d1",
        assetId: "a1",
        kind: "dividend",
        quantity: 2,
        price: 0.579,
        fee: 0,
        date: "2026-11-09",
      },
    ];
    const okActivity = computeAssetActivitySummary(txs, "a1", "EUR", eurUsdPrices);
    expect(okActivity.bought).toBeCloseTo(30, 4);
    expect(okActivity.dividends).toBeCloseTo(1.0, 4);
    expect(okActivity.sold).toBe(0);

    const missingActivity = computeAssetActivitySummary(
      [
        {
          id: "old",
          assetId: "a1",
          kind: "buy",
          quantity: 1,
          price: 10,
          fee: 0,
          date: "2022-01-05",
        },
      ],
      "a1",
      "EUR",
      eurUsdPrices,
    );
    expect(missingActivity.boughtFxComplete).toBe(false);
    expect(formatBaseCurrencyAmount(missingActivity.bought, "EUR", "en")).toBe("—");
  });
});

describe("Issue 4 — Historical FX reconstruction accuracy, residuals & conservative disclosure", () => {
  it("quantifies lossless exactness vs intraday drift, Yahoo close revisions, fees & spot fallback disclosure", () => {
    const eurUsdPrices = makeDailyPrices(
      SYNTHETIC_13_TRADES_EUR_DATES.map((t) => [t.date, t.fxClose]),
    );
    const asset: Asset = {
      id: "spyl-id",
      symbol: "SPYL.DE",
      name: "SPDR S&P 500 UCITS ETF",
      type: "etf",
      sector: "Broad Market",
      region: "North America",
      quoteCurrency: "EUR",
      quoteNativePrice: 16.08,
      price: 16.08 * 1.158,
      change24h: 0,
      dividendPerShare: 0,
      payMonths: [],
    };
    // Exact daily close at import time == finalized close -> €251.80 lossless round-trip + fee test
    const feeTrade: Transaction = {
      id: "fee-1",
      assetId: "spyl-id",
      kind: "buy",
      quantity: 10,
      price: 10 * 1.158, // €100 notional
      fee: 1.5 * 1.158, // €1.50 fee
      date: "2026-11-09",
    };
    const exactMetrics = computeHoldingBaseMetrics(
      computeHoldings([asset], [feeTrade])[0]!,
      [feeTrade],
      "EUR",
      { liveEurPerUsd: 1 / 1.2, eurUsdPrices },
    );
    expect(exactMetrics.costBasis).toBeCloseTo(101.5, 8);
    expect(exactMetrics.costBasisMethod).toBe("dated-historical-fx");

    // Intraday same-day FX drift (imported using intraday 1.1520 vs daily finalized 1.1580) -> non-zero residual!
    const intradayImportUsd = (1000 * 1.152) / 10;
    const intradayTx: Transaction = {
      id: "intraday-1",
      assetId: "spyl-id",
      kind: "buy",
      quantity: 10,
      price: intradayImportUsd,
      fee: 0,
      date: "2026-11-09",
    };
    const intradayMetrics = computeHoldingBaseMetrics(
      computeHoldings([asset], [intradayTx])[0]!,
      [intradayTx],
      "EUR",
      { liveEurPerUsd: 1 / 1.158, eurUsdPrices },
    );
    const intradayResidual = Math.abs(intradayMetrics.costBasis - 1000);
    expect(intradayResidual).toBeGreaterThan(5); // ~€5.18 residual on €1,000 confirms not guaranteed lossless

    // Provider historical revision (+4 bps revision: 1.1580 -> 1.1585) -> small deterministic residual
    const revisedMetrics = computeHoldingBaseMetrics(
      computeHoldings([asset], [feeTrade])[0]!,
      [feeTrade],
      "EUR",
      {
        liveEurPerUsd: 1 / 1.1585,
        eurUsdPrices: makeDailyPrices([["2026-11-09", 1.1585]]),
      },
    );
    expect(Math.abs(revisedMetrics.costBasis - 101.5)).toBeCloseTo(0.0438, 3);

    // Missing historical FX triggers explicit spotFallbackSymbols & datedFxComplete = false
    const fallbackSummary = computePortfolioBaseMetrics(
      computeHoldings([asset], [feeTrade]),
      [feeTrade],
      "EUR",
      { liveEurPerUsd: 1 / 1.2, eurUsdPrices: [] },
    );
    expect(fallbackSummary.datedFxComplete).toBe(false);
    expect(fallbackSummary.spotFallbackSymbols).toEqual(["SPYL.DE"]);
    expect(fallbackSummary.byAssetId.get("spyl-id")?.costBasisMethod).toBe("spot-fx-fallback");
  });
});

describe("Issue 5 — Legacy 13-trade fixture (VXUS stock + SPYL etf, zero DB updates)", () => {
  it("reproduces €340.38 invested, 100% ETF classification & 13/13 duplicate protection with zero DB changes", () => {
    const eurUsdPrices = makeDailyPrices(
      SYNTHETIC_13_TRADES_EUR_DATES.map((t) => [t.date, t.fxClose]),
    );
    // Simulate legacy DB rows exactly as stored in production prior to identity fix:
    // bare symbols 'VXUS' (type='stock') & 'SPYL' (type='etf'), NO isin, NO quoteSymbol
    const legacyDbAssets = [
      {
        id: "db-vxus",
        symbol: "VXUS",
        name: "Vanguard FTSE All-World ex-US UCITS ETF (USD) Accumulating",
        type: "stock" as const,
        sector: "Other",
        region: "Global",
        price: 4.04 * 1.158,
        quoteNativePrice: 4.04,
        quoteCurrency: "EUR",
        change24h: 0,
        dividendPerShare: 0,
        payMonths: [],
      },
      {
        id: "db-spyl",
        symbol: "SPYL",
        name: "SPDR S&P 500 UCITS ETF (Acc)",
        type: "etf" as const,
        sector: "Other",
        region: "Global",
        price: 16.08 * 1.158,
        quoteNativePrice: 16.08,
        quoteCurrency: "EUR",
        change24h: 0,
        dividendPerShare: 0,
        payMonths: [],
      },
    ];
    // Client-side enrichment matching PortfolioProvider (without DB updates)
    const runtimeAssets: Asset[] = legacyDbAssets.map((a) => {
      const id = resolveAssetIdentity({ symbol: a.symbol, name: a.name, type: a.type });
      return {
        ...a,
        type: id.effectiveType,
        ...(id.isin ? { isin: id.isin } : {}),
        quoteSymbol: id.quoteSymbol,
      };
    });
    expect(runtimeAssets.map((a) => [a.symbol, a.type, a.quoteSymbol, a.isin])).toEqual([
      ["VXUS", "etf", "VXUS.DE", "IE0009A5ADV9"],
      ["SPYL", "etf", "SPYL.DE", "IE000XZSV718"],
    ]);

    const txs: Transaction[] = SYNTHETIC_13_TRADES_EUR_DATES.map((t) => ({
      id: `leg-${t.id}`,
      assetId: t.symbol === "VXUS" ? "db-vxus" : "db-spyl",
      brokerId: "b-t212",
      kind: "buy",
      quantity: t.quantity,
      price: Number((t.eurTotal / t.quantity).toFixed(8)) * t.fxClose,
      fee: 0,
      date: t.date,
    }));
    const holdings = computeHoldings(runtimeAssets, txs);
    const summary = computePortfolioBaseMetrics(holdings, txs, "EUR", {
      liveEurPerUsd: 1 / 1.158,
      eurUsdPrices,
    });
    expect(formatBaseCurrencyAmount(summary.totalCost, "EUR", "en")).toBe("€340.38");
    const classBreakdown = groupBy(holdingsInBaseCurrency(holdings, summary), (h) => h.asset.type);
    expect(classBreakdown).toHaveLength(1);
    expect(classBreakdown[0]!.name).toBe("etf");

    // Re-importing genuine Trading 212 CSV must recognize all 13 trades as duplicates
    const csvRows = [
      T212_HEADER,
      ...SYNTHETIC_13_TRADES_EUR_DATES.map((t) => {
        const isin = t.symbol === "VXUS" ? "IE0009A5ADV9" : "IE000XZSV718";
        const name =
          t.symbol === "VXUS"
            ? "Vanguard FTSE All-World ex-US UCITS ETF (USD) Accumulating"
            : "SPDR S&P 500 UCITS ETF (Acc)";
        return `Market buy,${t.date} 10:00:00,${isin},${t.symbol},${name},,${t.id},${t.quantity},${(t.eurTotal / t.quantity).toFixed(8)},EUR,1.00000000,${t.eurTotal.toFixed(2)},EUR,,`;
      }),
    ].join("\n");
    const parsed = analyzeBrokerCsv("trading212", csvRows);
    const normalizedUsd = parsed.transactions.map((row) => {
      const rate = SYNTHETIC_13_TRADES_EUR_DATES.find((x) => x.date === row.date)!.fxClose;
      return { ...row, price: row.price * rate, currency: "USD" };
    });
    const existing = existingImportTransactions(txs, legacyDbAssets, "b-t212");
    const dupes = splitDuplicates(parsed.transactions, existing, normalizedUsd);
    expect(dupes.fresh).toHaveLength(0);
    expect(dupes.duplicates).toHaveLength(13);
  });
});
