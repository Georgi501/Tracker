import { describe, expect, it } from "vitest";
import {
  computeBaseCurrencyRealizedReport,
  computeHoldingBaseMetrics,
  computePortfolioBaseMetrics,
} from "@/lib/base-currency-accounting";
import { buildPortfolioHistory } from "@/lib/history";
import { parsePortfolioBackup } from "@/lib/backup";
import { parseBrokerCsv } from "@/lib/csv-import";
import {
  brokerHoldings,
  computeHoldings,
  transactionsFingerprint,
  type Asset,
  type Transaction,
} from "@/lib/portfolio";
import { increasesOversellAmount } from "@/lib/quality";
import {
  exportCsv,
  fifoSalePreview,
  fifoTaxReport,
  taxReportCsv,
  taxReportHtml,
} from "@/lib/tools";
import { transactionChronology } from "@/lib/transaction-chronology";

const date = "2026-10-15";
const asset: Asset = {
  id: "asset",
  symbol: "VXUS.DE",
  name: "VXUS",
  type: "etf",
  sector: "Other",
  region: "Global",
  price: 45,
  change24h: 0,
  dividendPerShare: 0,
  payMonths: [],
};
const tx = (
  id: string,
  kind: "buy" | "sell",
  quantity: number,
  price: number,
  sourceExecutedAt?: string,
  fee = 0,
): Transaction => ({
  id,
  assetId: asset.id,
  kind,
  quantity,
  price,
  date,
  fee,
  ...(sourceExecutedAt ? { sourceExecutedAt } : {}),
});
const buyEarly = tx("z", "buy", 10, 10, `${date} 09:00:00`);
const buyLate = tx("a", "buy", 10, 30, `${date} 11:00:00`);
const sell = tx("m", "sell", 5, 40, `${date} 14:00:00`);
const options = { liveEurPerUsd: 0.7, eurUsdPrices: [{ date, close: 1.25 }] };
const prices = [{ id: asset.id, type: "etf", currency: "USD", prices: [{ date, close: 45 }] }];

describe("transaction execution chronology", () => {
  it.each([
    ["chronological", [buyEarly, buyLate, sell]],
    ["reversed", [sell, buyLate, buyEarly]],
    ["sale first", [sell, buyEarly, buyLate]],
    ["database order", [buyLate, sell, buyEarly]],
    [
      "different insertion IDs and times",
      [buyLate, buyEarly, sell].map((trade, i) => ({
        ...trade,
        id: String(i),
        createdAt: `2026-11-20T12:00:0${i}Z`,
      })),
    ],
  ] as const)("reconciles the same executions in %s order", (_, input) => {
    const trades = [...input];
    const holdings = computeHoldings([asset], trades);
    expect(holdings[0]).toMatchObject({ quantity: 15, costBasis: 300, value: 675 });
    expect(brokerHoldings([asset], trades, [])[0]).toMatchObject({ quantity: 15, costBasis: 350 });
    expect(fifoTaxReport(trades)[0]).toMatchObject({ proceeds: 200, cost: 50, realized: 150 });
    expect(increasesOversellAmount([], trades)).toBe(false);
    for (const [currency, divisor] of [
      ["USD", 1],
      ["EUR", 1.25],
    ] as const) {
      const base = computePortfolioBaseMetrics(holdings, trades, currency, options);
      const detail = computeHoldingBaseMetrics(holdings[0]!, trades, currency, options);
      expect(base.totalCost).toBe(300 / divisor);
      expect(base.totalPnl).toBe(detail.pnl);
      expect(
        computeBaseCurrencyRealizedReport(trades, currency, options).totalRealized,
      ).toBeCloseTo(150 / divisor);
      const history = buildPortfolioHistory(
        prices,
        trades,
        date,
        date,
        currency,
        options.eurUsdPrices,
        [],
      );
      expect(history.points[0]).toMatchObject({ v: 675 / divisor, flow: 200 / divisor });
    }
  });

  it("consumes the more expensive lot when it was acquired first", () => {
    const trades = [sell, { ...buyEarly, price: 30 }, { ...buyLate, price: 10 }];
    expect(fifoTaxReport(trades)[0]?.realized).toBe(50);
  });

  it("reconciles two fractional partial sales and all fees", () => {
    const trades = [
      tx("s2", "sell", 0.75, 50, `${date}T16:30:00Z`, 0.3),
      tx("b2", "buy", 2, 30, `${date}T10:30:00Z`, 0.4),
      tx("s1", "sell", 1, 40, `${date}T15:30:00Z`, 0.2),
      tx("b1", "buy", 1.5, 10, `${date}T09:30:00Z`, 0.3),
    ];
    const report = computeBaseCurrencyRealizedReport(trades, "USD");
    expect(report.salesCount).toBe(2);
    expect(report.totalRealized).toBeCloseTo(54.15);
    expect(report.totalProceeds).toBeCloseTo(77);
    expect(report.totalCost).toBeCloseTo(22.85);
    const holding = computeHoldings([asset], trades)[0]!;
    expect(holding.quantity).toBe(1.75);
    expect(holding.costBasis).toBeCloseTo(37.85);
  });

  it("orders offset-bearing executions by instant across calendar-date boundaries", () => {
    const early = { ...tx("early", "buy", 2, 10, "2026-10-16T00:30:00+02:00"), date: "2026-10-16" };
    const later = tx("later", "sell", 1, 40, "2026-10-15T23:00:00Z");
    const trades = [later, early];
    expect(fifoTaxReport(trades)[0]?.realized).toBe(30);
    expect(computeHoldings([asset], trades)[0]?.quantity).toBe(1);
    expect(
      buildPortfolioHistory(prices, trades, date, date, "USD", [], []).points[0],
    ).toMatchObject({ v: 45, flow: -20 });
  });

  it.each([
    [
      "same instant, opaque numeric IDs",
      { ...buyEarly, sourceExecutedAt: `${date}T14:00:00Z`, sourceTransactionId: "t212:fill:100" },
      { ...sell, sourceExecutedAt: `${date}T14:00:00Z`, sourceTransactionId: "t212:fill:200" },
    ],
    ["legacy date-only buy", tx("legacy", "buy", 10, 10), sell],
    ["malformed execution metadata", { ...buyEarly, sourceExecutedAt: `${date}T25:00:00Z` }, sell],
    [
      "incomparable zoned and wall clocks",
      buyEarly,
      { ...sell, sourceExecutedAt: `${date}T14:00:00Z` },
    ],
    [
      "minute precision overlaps a timed sale",
      { ...buyEarly, sourceExecutedAt: `${date}T14:00Z` },
      { ...sell, sourceExecutedAt: `${date}T14:00:19Z` },
    ],
  ] as const)("withholds unverifiable basis for %s", (_, buy, disposal) => {
    const trades = [disposal, buy];
    expect(transactionChronology(trades).mixed.has(asset.id)).toBe(true);
    expect(computeHoldings([asset], trades)[0]).toMatchObject({ quantity: 5, costBasis: NaN });
    expect(computeBaseCurrencyRealizedReport(trades, "USD")).toMatchObject({
      salesCount: 1,
      method: "unverified-chronology",
      totalRealized: NaN,
    });
    const report = fifoTaxReport(trades);
    expect(report[0]?.realized).toBeNaN();
    expect(taxReportCsv(report, [asset])).not.toContain("NaN");
    expect(taxReportHtml(report, [asset], "en")).not.toContain("NaN");
  });

  it("does not discard a verifiable oversell or reuse an invalid position as a market total", () => {
    const earlySell = { ...sell, sourceExecutedAt: `${date} 08:00:00` };
    const trades = [buyEarly, earlySell];
    expect(transactionChronology(trades).invalid.has(asset.id)).toBe(true);
    expect(increasesOversellAmount([], trades)).toBe(true);
    const holdings = computeHoldings([asset], trades);
    expect(holdings[0]).toMatchObject({ quantity: 5, value: NaN, costBasis: NaN });
    expect(computeBaseCurrencyRealizedReport(trades, "USD")).toMatchObject({
      salesCount: 1,
      totalRealized: NaN,
    });
    expect(buildPortfolioHistory(prices, trades, date, date, "USD", [], []).unavailable).toBe(true);
  });

  it("keeps legacy buy-only holdings and identifies unresolved acquisition lots on sale", () => {
    const buys = [tx("l2", "buy", 10, 30), tx("l1", "buy", 10, 10)];
    expect(computeHoldings([asset], buys)[0]?.costBasis).toBe(400);
    expect(transactionChronology(buys).affectedFifo.size).toBe(0);
    expect(fifoSalePreview(buys, asset.id, 5, 40)).toBeNull();
    expect(
      fifoTaxReport([
        ...buys,
        { ...sell, date: "2026-10-16", sourceExecutedAt: "2026-10-16T14:00:00Z" },
      ])[0]?.realized,
    ).toBeNaN();
  });

  it("keeps sub-millisecond provider precision and invalidates the history key on execution changes", () => {
    const a = { ...buyEarly, sourceExecutedAt: `${date}T09:00:00.000001Z` };
    const b = { ...buyLate, sourceExecutedAt: `${date}T09:00:00.000002Z` };
    const s = { ...sell, sourceExecutedAt: `${date}T14:00:00Z` };
    expect(fifoTaxReport([b, a, s])[0]?.realized).toBe(150);
    expect(transactionsFingerprint([a])).not.toBe(transactionsFingerprint([buyEarly]));
  });

  it("retains execution metadata on CSV and JSON backup round trips", () => {
    const original = {
      ...buyEarly,
      sourceTransactionId: "ibkr:trade:opaque",
      sourceExecutedAt: "20261015;090000",
    };
    const fields = {
      sourceTransactionId: original.sourceTransactionId,
      sourceExecutedAt: original.sourceExecutedAt,
      date,
    };
    expect(parseBrokerCsv("generic", exportCsv([asset], [original]))[0]).toMatchObject(fields);
    expect(parsePortfolioBackup({ assets: [asset], transactions: [original] })[0]).toMatchObject(
      fields,
    );
  });
});
