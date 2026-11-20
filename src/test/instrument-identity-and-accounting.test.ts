import { describe, expect, it } from "vitest";
import {
  computeHoldingBaseMetrics,
  computePortfolioBaseMetrics,
  formatBaseCurrencyAmount,
} from "@/lib/base-currency-accounting";
import { parseFlexReport, parseT212Orders } from "@/lib/brokers.server";
import {
  analyzeBrokerCsv,
  existingImportTransactions,
  prepareCsvText,
  splitDuplicates,
} from "@/lib/csv-import";
import {
  calculatePortfolioGeographicExposure,
  resolveInstrumentGeoProfile,
} from "@/lib/geographic-exposure";
import { currencyRate, type DailyPrice } from "@/lib/history";
import {
  canonicalIdentityKey,
  guessInstrumentAssetType,
  resolveAssetIdentity,
  resolveImportedInstrument,
  validateQuoteIdentity,
} from "@/lib/instrument-identity";
import { calculatePortfolioInvestmentFocus, resolveInstrumentFocus } from "@/lib/investment-focus";
import { computeHoldings, type Asset, type Transaction } from "@/lib/portfolio";

const T212_HEADER =
  "Action,Time (UTC),ISIN,Ticker,Name,Notes,ID,No. of shares,Price / share,Currency (Price / share),Exchange rate,Total,Currency (Total),Merchant name,Merchant category";

describe("instrument identity, collision guards, UCITS normalization & base-currency accounting", () => {
  it("1. Disambiguates ticker collisions cleanly (VXUS UCITS vs VXUS US, EQQQ UCITS vs EQQQ US)", () => {
    const ucitsVxus = resolveImportedInstrument({
      symbol: "VXUS",
      isin: "IE0009A5ADV9",
      name: "Vanguard FTSE All-World ex-US UCITS ETF USD Acc",
      currency: "EUR",
    });
    expect(ucitsVxus.quoteSymbol).toBe("VXUS.DE");
    expect(ucitsVxus.isin).toBe("IE0009A5ADV9");
    expect(ucitsVxus.effectiveType).toBe("etf");
    expect(ucitsVxus.expectedCurrency).toBe("EUR");
    expect(ucitsVxus.isUcits).toBe(true);

    const usVxus = resolveImportedInstrument({
      symbol: "VXUS",
      isin: "US9220427424",
      name: "Vanguard Total International Stock ETF",
      currency: "USD",
    });
    expect(usVxus.quoteSymbol).toBe("VXUS");
    expect(usVxus.isin).toBe("US9220427424");
    expect(usVxus.effectiveType).toBe("etf");
    expect(usVxus.expectedCurrency).toBe("USD");
    expect(usVxus.isUcits).toBe(false);

    expect(
      canonicalIdentityKey({
        symbol: "VXUS.DE",
        isin: "IE0009A5ADV9",
        name: "Vanguard FTSE All-World ex-US UCITS ETF USD Acc",
        type: "etf",
        currency: "EUR",
      }),
    ).not.toBe(
      canonicalIdentityKey({
        symbol: "VXUS",
        isin: "US9220427424",
        name: "Vanguard Total International Stock ETF",
        type: "etf",
        currency: "USD",
      }),
    );

    const eqqqUcits = resolveImportedInstrument({
      symbol: "EQQQ",
      isin: "IE0032077012",
      name: "Invesco EQQQ Nasdaq-100 UCITS ETF",
      currency: "EUR",
    });
    expect(eqqqUcits.quoteSymbol).toBe("EQQQ.DE");
    expect(eqqqUcits.expectedCurrency).toBe("EUR");
    expect(
      validateQuoteIdentity(eqqqUcits, {
        providerSymbol: "EQQQ",
        currency: "USD",
        exchangeName: "NGM",
        instrumentType: "ETF",
        longName: "ProShares Ultra QQQ Equal Weight",
      }),
    ).toEqual({ ok: false, reason: "ticker_collision_blocked" });
  });

  it("2. VXUS UCITS (IE0009A5ADV9): blocks US $77.93 NGM quote and accepts VXUS.DE EUR Xetra quote", () => {
    const csv = [
      T212_HEADER,
      "Market buy,2026-06-15 10:00:00,IE0009A5ADV9,VXUS,Vanguard FTSE All-World ex-US UCITS ETF,,SYN-VXUS-1,10,4.20,EUR,1.00000000,42.00,EUR,,",
    ].join("\n");

    const analysis = prepareCsvText(csv, "trading212");
    expect(analysis.transactions[0]).toMatchObject({
      symbol: "VXUS.DE",
      brokerSymbol: "VXUS",
      isin: "IE0009A5ADV9",
      assetType: "etf",
      currency: "EUR",
    });

    // Legacy bare-ticker record still resolves safely without falling back to US VXUS
    const legacyIdentity = resolveAssetIdentity({
      symbol: "VXUS",
      name: "Vanguard FTSE All-World ex-US UCITS ETF (USD) Accumulating",
      type: "stock",
    });
    expect(legacyIdentity.quoteSymbol).toBe("VXUS.DE");
    expect(legacyIdentity.effectiveType).toBe("etf");
    expect(legacyIdentity.expectedCurrency).toBe("EUR");

    // Must block US Nasdaq VXUS ($77.93)
    expect(
      validateQuoteIdentity(legacyIdentity, {
        providerSymbol: "VXUS",
        currency: "USD",
        exchangeName: "NGM",
        instrumentType: "ETF",
        longName: "Vanguard Total International Stock Index Fund ETF Shares",
      }),
    ).toEqual({ ok: false, reason: "ticker_collision_blocked" });

    // Must accept Xetra VXUS.DE EUR quote
    expect(
      validateQuoteIdentity(legacyIdentity, {
        providerSymbol: "VXUS.DE",
        currency: "EUR",
        exchangeName: "GER",
        fullExchangeName: "XETRA",
        instrumentType: "ETF",
        longName: "Vanguard Funds PLC - Vanguard FTSE All-World Ex-U.S. UCITS ETF USD Acc",
      }),
    ).toEqual({ ok: true });

    const focus = resolveInstrumentFocus({
      symbol: "VXUS.DE",
      name: "Vanguard FTSE All-World ex-US UCITS ETF",
      type: "etf",
      isin: "IE0009A5ADV9",
    });
    expect(focus.focus).toBe("global-ex-us");
  });

  it("3. SPYL (IE000XZSV718): normalizes to SPYL.DE, blocks dead Latin America collision and accepts EUR Xetra", () => {
    const csv = [
      T212_HEADER,
      "Market buy,2026-06-15 10:00:00,IE000XZSV718,SPYL,SPDR S&P 500 UCITS ETF,,SYN-SPYL-1,5,16.15,EUR,1.00000000,80.75,EUR,,",
    ].join("\n");

    const analysis = prepareCsvText(csv, "trading212");
    expect(analysis.transactions[0]).toMatchObject({
      symbol: "SPYL.DE",
      brokerSymbol: "SPYL",
      isin: "IE000XZSV718",
      assetType: "etf",
      currency: "EUR",
    });

    const spylIdentity = resolveAssetIdentity({
      symbol: "SPYL",
      name: "SPDR S&P 500 UCITS ETF",
      type: "etf",
      isin: "IE000XZSV718",
    });
    expect(spylIdentity.quoteSymbol).toBe("SPYL.DE");

    // Must block unrelated US Nasdaq GIDS Latin America collision
    expect(
      validateQuoteIdentity(spylIdentity, {
        providerSymbol: "SPYL",
        currency: "USD",
        exchangeName: "NIM",
        instrumentType: "ETF",
        shortName: "SPDR MSCI EM Latin America UCIT",
      }),
    ).toEqual({ ok: false, reason: "ticker_collision_blocked" });

    // Must accept Xetra SPYL.DE EUR quote
    expect(
      validateQuoteIdentity(spylIdentity, {
        providerSymbol: "SPYL.DE",
        currency: "EUR",
        exchangeName: "GER",
        fullExchangeName: "XETRA",
        instrumentType: "ETF",
        longName: "State Street SPDR S&P 500 UCITS ETF USD Accumulation UnHedged",
      }),
    ).toEqual({ ok: true });

    const focus = resolveInstrumentFocus({
      symbol: "SPYL.DE",
      name: "SPDR S&P 500 UCITS ETF",
      type: "etf",
      isin: "IE000XZSV718",
    });
    expect(focus.focus).toBe("us");
  });

  it("4. Covers popular UCITS ETFs plus uncatalogued European UCITS ETF collision guards", () => {
    const cases: Array<[string, string, string, string, "EUR" | "USD"]> = [
      ["IWDA", "IE00B4L5Y983", "iShares Core MSCI World UCITS ETF", "IWDA.AS", "EUR"],
      ["VWCE", "IE00BK5BQT80", "Vanguard FTSE All-World UCITS ETF", "VWCE.DE", "EUR"],
      ["SXR8", "IE00B5BMR087", "iShares Core S&P 500 UCITS ETF", "SXR8.DE", "EUR"],
      ["SXRV", "IE00B53SZB19", "iShares Nasdaq 100 UCITS ETF", "SXRV.DE", "EUR"],
      ["IXUA", "IE000R4ZNTN3", "iShares MSCI World ex-USA UCITS ETF", "IXUA.DE", "EUR"],
      ["XNAS", "IE00BMFKG444", "Xtrackers Nasdaq 100 UCITS ETF", "XNAS.DE", "EUR"],
      ["IS3N", "IE00BKM4GZ66", "iShares Core MSCI EM IMI UCITS ETF", "IS3N.DE", "EUR"],
      ["EQQQ", "IE0032077012", "Invesco EQQQ Nasdaq-100 UCITS ETF", "EQQQ.DE", "EUR"],
    ];

    for (const [ticker, isin, name, expectedSymbol, currency] of cases) {
      const resolved = resolveImportedInstrument({ symbol: ticker, isin, name, currency });
      expect(resolved.quoteSymbol).toBe(expectedSymbol);
      expect(resolved.effectiveType).toBe("etf");
      expect(resolved.expectedCurrency).toBe(currency);
      expect(resolved.verified).toBe(true);
    }

    // Uncatalogued European UCITS ETF with bare ticker: typed "etf" and never hijacked by US quote
    const uncatalogued = resolveImportedInstrument({
      symbol: "ABCD",
      isin: "IE000FAKE001",
      name: "Example Global Thematic UCITS ETF Acc",
      currency: "EUR",
    });
    expect(uncatalogued.effectiveType).toBe("etf");
    expect(uncatalogued.quoteSymbol).toBe("ABCD");
    expect(uncatalogued.forbidUsListingCollision).toBe(true);
    expect(
      validateQuoteIdentity(uncatalogued, {
        providerSymbol: "ABCD",
        currency: "USD",
        exchangeName: "NMS",
        instrumentType: "ETF",
      }),
    ).toEqual({ ok: false, reason: "ticker_collision_blocked" });
  });

  it("5. Classifies imported ETFs properly and upgrades legacy misclassified UCITS ETFs at runtime", () => {
    expect(
      guessInstrumentAssetType({
        symbol: "VXUS",
        name: "Vanguard FTSE All-World ex-US UCITS ETF USD Acc",
        declaredType: "stock",
      }),
    ).toBe("etf");

    // Direct Trading 212 & IBKR sync parsers also classify ETFs properly instead of hardcoding stock
    const t212Direct = parseT212Orders([
      {
        fill: {
          id: 1001,
          filledAt: "2026-06-10T10:00:00Z",
          price: 4.15,
          quantity: 5,
          type: "TRADE",
        },
        order: {
          id: 2001,
          side: "BUY",
          instrument: {
            ticker: "VXUS",
            name: "Vanguard FTSE All-World ex-US UCITS ETF",
            currency: "EUR",
          },
        },
      },
    ]);
    expect(t212Direct[0]?.symbol).toBe("VXUS.DE");
    expect(t212Direct[0]?.assetType).toBe("etf");

    const flexXml = `<FlexQueryResponse><FlexStatements><FlexStatement><Trades><Trade tradeID="T-1" symbol="VWCE" description="Vanguard FTSE All-World UCITS ETF" isin="IE00BK5BQT80" buySell="BUY" quantity="2" tradePrice="140.00" currency="EUR" dateTime="20260610" ibCommission="-1.25" ibCommissionCurrency="EUR" assetCategory="STK" /></Trades></FlexStatement></FlexStatements></FlexQueryResponse>`;
    const flexRows = parseFlexReport(flexXml);
    expect(flexRows[0]?.symbol).toBe("VWCE.DE");
    expect(flexRows[0]?.assetType).toBe("etf");
  });

  it("6. Reconciles 13-trade EUR VXUS+SPYL portfolio: eliminates +€1.64 spot-FX drift and P&L > Value anomaly", () => {
    // 13 synthetic EUR BUY fills aggregating to exact totals:
    // VXUS.DE: 20.74030804 shares, €88.58 cost
    // SPYL.DE: 14.91826222 shares, €251.80 cost
    // Combined EUR cost: €340.38
    const tradesEur: Array<{
      assetId: string;
      date: string;
      qty: number;
      eurTotal: number;
    }> = [
      { assetId: "vxus-id", date: "2026-05-04", qty: 5.0, eurTotal: 21.35 },
      { assetId: "vxus-id", date: "2026-05-18", qty: 4.5, eurTotal: 19.22 },
      { assetId: "vxus-id", date: "2026-06-08", qty: 3.75, eurTotal: 16.01 },
      { assetId: "vxus-id", date: "2026-06-22", qty: 4.25, eurTotal: 18.15 },
      { assetId: "vxus-id", date: "2026-07-06", qty: 3.24030804, eurTotal: 13.85 },
      { assetId: "spyl-id", date: "2026-05-04", qty: 2.0, eurTotal: 33.76 },
      { assetId: "spyl-id", date: "2026-05-11", qty: 1.8, eurTotal: 30.38 },
      { assetId: "spyl-id", date: "2026-05-25", qty: 2.2, eurTotal: 37.13 },
      { assetId: "spyl-id", date: "2026-06-01", qty: 1.75, eurTotal: 29.54 },
      { assetId: "spyl-id", date: "2026-06-15", qty: 2.1, eurTotal: 35.45 },
      { assetId: "spyl-id", date: "2026-06-29", qty: 1.9, eurTotal: 32.07 },
      { assetId: "spyl-id", date: "2026-07-06", qty: 1.6, eurTotal: 27.0 },
      { assetId: "spyl-id", date: "2026-07-13", qty: 1.56826222, eurTotal: 26.47 },
    ];

    const eurUsdPrices: DailyPrice[] = [
      { date: "2026-05-04", close: 1.104 },
      { date: "2026-05-11", close: 1.103 },
      { date: "2026-05-18", close: 1.102 },
      { date: "2026-05-25", close: 1.1015 },
      { date: "2026-06-01", close: 1.1025 },
      { date: "2026-06-08", close: 1.1035 },
      { date: "2026-06-15", close: 1.1028 },
      { date: "2026-06-22", close: 1.1018 },
      { date: "2026-06-29", close: 1.1012 },
      { date: "2026-07-06", close: 1.102 },
      { date: "2026-07-13", close: 1.1022 },
    ];

    const transactions: Transaction[] = tradesEur.map((t, idx) => {
      const eurUsdOnTrade = currencyRate("EUR", t.date, eurUsdPrices, [])!;
      const eurUnit = t.eurTotal / t.qty;
      return {
        id: `tx-${idx + 1}`,
        assetId: t.assetId,
        kind: "buy",
        quantity: t.qty,
        price: eurUnit * eurUsdOnTrade,
        fee: 0,
        date: t.date,
      };
    });

    const spotEurUsd = 1.0971;
    const liveEurPerUsd = 1 / spotEurUsd;
    const vxusEurQuote = 4.062;
    const spylEurQuote = 16.159;

    const assets: Asset[] = [
      {
        id: "vxus-id",
        symbol: "VXUS.DE",
        name: "Vanguard FTSE All-World ex-US UCITS ETF (Acc)",
        type: "etf",
        sector: "Other",
        region: "Global",
        price: vxusEurQuote / spotEurUsd,
        quoteNativePrice: vxusEurQuote,
        quoteCurrency: "EUR",
        quoteAt: "2026-11-20T12:00:00Z",
        change24h: 0.4,
        dividendPerShare: 0,
        payMonths: [],
        isin: "IE0009A5ADV9",
        quoteSymbol: "VXUS.DE",
      },
      {
        id: "spyl-id",
        symbol: "SPYL.DE",
        name: "SPDR S&P 500 UCITS ETF (Acc)",
        type: "etf",
        sector: "Other",
        region: "Global",
        price: spylEurQuote / spotEurUsd,
        quoteNativePrice: spylEurQuote,
        quoteCurrency: "EUR",
        quoteAt: "2026-11-20T12:00:00Z",
        change24h: -0.2,
        dividendPerShare: 0,
        payMonths: [],
        isin: "IE000XZSV718",
        quoteSymbol: "SPYL.DE",
      },
    ];

    const holdings = computeHoldings(assets, transactions);

    // Proof of why the old spot-FX conversion produced +€1.64 drift (~€342.02 instead of €340.38)
    const oldSpotConvertedCostEur =
      holdings.reduce((sum, h) => sum + h.costBasis, 0) * liveEurPerUsd;
    expect(oldSpotConvertedCostEur).toBeGreaterThan(341.9);
    expect(oldSpotConvertedCostEur).toBeLessThan(342.2);

    // Fixed dated-FX base-currency accounting recovers exact €340.38 (€88.58 + €251.80)
    const summary = computePortfolioBaseMetrics(holdings, transactions, "EUR", {
      liveEurPerUsd,
      eurUsdPrices,
    });
    expect(summary.isComplete).toBe(true);
    expect(summary.datedFxComplete).toBe(true);
    expect(summary.totalCost).toBeCloseTo(340.38, 2);

    const vxusM = summary.byAssetId.get("vxus-id")!;
    const spylM = summary.byAssetId.get("spyl-id")!;
    const expectedVxusValue = 20.74030804 * vxusEurQuote;
    const expectedSpylValue = 14.91826222 * spylEurQuote;

    expect(vxusM.costBasis).toBeCloseTo(88.58, 2);
    expect(vxusM.value).toBeCloseTo(expectedVxusValue, 4);
    expect(vxusM.pnl).toBeCloseTo(vxusM.value - vxusM.costBasis, 6);
    expect(vxusM.pnl).toBeLessThan(vxusM.value); // buy-only invariant

    expect(spylM.costBasis).toBeCloseTo(251.8, 2);
    expect(spylM.value).toBeCloseTo(expectedSpylValue, 4);
    expect(spylM.pnl).toBeCloseTo(spylM.value - spylM.costBasis, 6);
    expect(spylM.pnl).toBeLessThan(spylM.value);

    expect(summary.totalValue).toBeCloseTo(expectedVxusValue + expectedSpylValue, 4);
    expect(summary.totalPnl).toBeCloseTo(summary.totalValue - summary.totalCost, 6);
    expect(summary.totalPnl).toBeLessThan(summary.totalValue);
    expect(summary.totalPnlPct).toBeCloseTo((summary.totalPnl / summary.totalCost) * 100, 6);
  });

  it("7. Multi-currency & partial valuation: handles USD holdings in EUR and suppresses totals on missing quotes", () => {
    const eurUsdPrices: DailyPrice[] = [
      { date: "2026-01-10", close: 1.05 },
      { date: "2026-06-10", close: 1.1 },
    ];
    // EUR investor bought $210 USD AAPL on 2026-01-10 -> cost in EUR = 210 / 1.05 = €200.00
    const assets: Asset[] = [
      {
        id: "aapl-id",
        symbol: "AAPL",
        name: "Apple Inc.",
        type: "stock",
        sector: "Technology",
        region: "North America",
        price: 220,
        quoteNativePrice: 220,
        quoteCurrency: "USD",
        quoteAt: "2026-11-20T12:00:00Z",
        change24h: 1,
        dividendPerShare: 0,
        payMonths: [],
      },
      {
        id: "spyl-id",
        symbol: "SPYL.DE",
        name: "SPDR S&P 500 UCITS ETF",
        type: "etf",
        sector: "Other",
        region: "Global",
        price: Number.NaN, // Missing quote
        change24h: Number.NaN,
        dividendPerShare: 0,
        payMonths: [],
      },
    ];
    const txs: Transaction[] = [
      {
        id: "tx-aapl",
        assetId: "aapl-id",
        kind: "buy",
        quantity: 1,
        price: 210,
        fee: 0,
        date: "2026-01-10",
      },
      {
        id: "tx-spyl",
        assetId: "spyl-id",
        kind: "buy",
        quantity: 5,
        price: 17.6, // 5 * 17.6 = $88 USD at EURUSD 1.10 -> €80.00 cost
        fee: 0,
        date: "2026-06-10",
      },
    ];
    const holdings = computeHoldings(assets, txs);
    const liveEurPerUsd = 1 / 1.1; // current spot €0.90909 per $1
    const aaplOnly = computeHoldingBaseMetrics(holdings[0]!, txs, "EUR", {
      liveEurPerUsd,
      eurUsdPrices,
    });
    expect(aaplOnly.costBasis).toBeCloseTo(200, 6);
    expect(aaplOnly.value).toBeCloseTo(220 * liveEurPerUsd, 6);
    expect(aaplOnly.pnl).toBeCloseTo(220 * liveEurPerUsd - 200, 6);

    const partial = computePortfolioBaseMetrics(holdings, txs, "EUR", {
      liveEurPerUsd,
      eurUsdPrices,
    });
    expect(partial.isComplete).toBe(false);
    expect(partial.missingQuoteSymbols).toEqual(["SPYL.DE"]);
    expect(Number.isNaN(partial.totalValue)).toBe(true);
    expect(Number.isNaN(partial.totalPnl)).toBe(true);
    expect(partial.totalCost).toBeCloseTo(280, 6);
    expect(formatBaseCurrencyAmount(partial.totalValue, "EUR", "en")).toBe("—");

    // Fractional GBX/GBP quote valuation works cleanly in both USD and EUR
    const lseAsset: Asset = {
      id: "lse-1",
      symbol: "VWRA.L",
      name: "Vanguard FTSE All-World UCITS ETF",
      type: "etf",
      sector: "Other",
      region: "Global",
      price: 135, // USD equivalent (already converted from GBP/GBX by prices.server/quotes.functions)
      quoteNativePrice: 10500,
      quoteCurrency: "GBX",
      quoteAt: "2026-11-20T12:00:00Z",
      change24h: 0.5,
      dividendPerShare: 0,
      payMonths: [],
    };
    const lseTxs: Transaction[] = [
      {
        id: "tx-lse",
        assetId: "lse-1",
        kind: "buy",
        quantity: 1.25,
        price: 120,
        fee: 0,
        date: "2026-06-10",
      },
    ];
    const lseHoldings = computeHoldings([lseAsset], lseTxs);
    const lseEur = computeHoldingBaseMetrics(lseHoldings[0]!, lseTxs, "EUR", {
      liveEurPerUsd,
      eurUsdPrices,
    });
    expect(lseEur.value).toBeCloseTo(1.25 * 135 * liveEurPerUsd, 6);
    expect(lseEur.costBasis).toBeCloseTo((1.25 * 120) / 1.1, 6);
    expect(lseEur.pnl).toBeCloseTo(lseEur.value - lseEur.costBasis, 6);
  });

  it("8. Duplicate protection works across symbol normalization without false merges between US & UCITS", () => {
    const csv = [
      T212_HEADER,
      "Market buy,2026-06-15 10:00:00,IE0009A5ADV9,VXUS,Vanguard FTSE All-World ex-US UCITS ETF,,FILL-1,10,4.20,EUR,1.0,42.00,EUR,,",
      "Market buy,2026-06-16 10:00:00,IE000XZSV718,SPYL,SPDR S&P 500 UCITS ETF,,FILL-2,5,16.15,EUR,1.0,80.75,EUR,,",
    ].join("\n");
    const parsed = prepareCsvText(csv, "trading212");
    const normalizedUsd = parsed.transactions.map((tx, idx) => ({
      ...tx,
      price: idx === 0 ? 4.62 : 17.765,
      currency: "USD",
    }));

    // Existing DB rows with legacy bare symbols ("VXUS", "SPYL") and NO sourceTransactionId
    const legacyAssets: Asset[] = [
      {
        id: "a-vxus",
        symbol: "VXUS",
        name: "Vanguard FTSE All-World ex-US UCITS ETF",
        type: "stock",
        sector: "Other",
        region: "Global",
        price: 4,
        change24h: 0,
        dividendPerShare: 0,
        payMonths: [],
      },
      {
        id: "a-spyl",
        symbol: "SPYL",
        name: "SPDR S&P 500 UCITS ETF",
        type: "etf",
        sector: "Other",
        region: "Global",
        price: 16,
        change24h: 0,
        dividendPerShare: 0,
        payMonths: [],
      },
    ];
    const legacyTxs: Transaction[] = [
      {
        id: "db-1",
        assetId: "a-vxus",
        brokerId: "b-1",
        kind: "buy",
        quantity: 10,
        price: 4.62,
        fee: 0,
        date: "2026-06-15",
      },
      {
        id: "db-2",
        assetId: "a-spyl",
        brokerId: "b-1",
        kind: "buy",
        quantity: 5,
        price: 17.765,
        fee: 0,
        date: "2026-06-16",
      },
    ];

    const existing = existingImportTransactions(legacyTxs, legacyAssets, "b-1");
    const dupes = splitDuplicates(parsed.transactions, existing, normalizedUsd);
    expect(dupes.fresh).toHaveLength(0);
    expect(dupes.duplicates).toHaveLength(2);

    // Provider sourceTransactionId also deduplicates immediately even before FX conversion
    const existingWithSourceId = existing.map((t, i) => ({
      ...t,
      sourceTransactionId: parsed.transactions[i]!.sourceTransactionId,
    }));
    const dupesById = splitDuplicates(parsed.transactions, existingWithSourceId);
    expect(dupesById.fresh).toHaveLength(0);
    expect(dupesById.duplicates).toHaveLength(2);

    // Distinct US VXUS (US9220427424) never merges with UCITS VXUS.DE (IE0009A5ADV9)
    const usVxusTxs = [
      {
        symbol: "VXUS",
        isin: "US9220427424",
        name: "Vanguard Total International Stock ETF",
        assetType: "etf" as const,
        kind: "buy" as const,
        quantity: 10,
        price: 4.62,
        fee: 0,
        date: "2026-06-15",
        currency: "USD",
      },
    ];
    const nonDuplicateUsVsUcits = splitDuplicates([parsed.transactions[0]!], usVxusTxs, [
      normalizedUsd[0]!,
    ]);
    expect(nonDuplicateUsVsUcits.fresh).toHaveLength(1);
    expect(nonDuplicateUsVsUcits.duplicates).toHaveLength(0);
  });

  it("9. Legacy bare-ticker runtime resolution & non-regression (Focus, Geo, Revolut, IBKR, Generic)", () => {
    const legacyVxusAsset: Asset = {
      id: "legacy-vxus",
      symbol: "VXUS",
      name: "Vanguard FTSE All-World ex-US UCITS ETF (USD) Accumulating",
      type: "stock",
      sector: "Other",
      region: "Global",
      price: 4.4,
      change24h: 0,
      dividendPerShare: 0,
      payMonths: [],
    };
    const identity = resolveAssetIdentity(legacyVxusAsset);
    expect(identity.effectiveType).toBe("etf");
    expect(identity.quoteSymbol).toBe("VXUS.DE");
    expect(identity.isin).toBe("IE0009A5ADV9");

    const geoProfile = resolveInstrumentGeoProfile({
      symbol: legacyVxusAsset.symbol,
      name: legacyVxusAsset.name,
      type: identity.effectiveType,
    });
    expect(geoProfile.kind).toBe("fund");
    expect(geoProfile.dataQuality).toBe("license-restricted");
    expect(geoProfile.regions).toEqual({ Unknown: 1 });

    const focusSummary = calculatePortfolioInvestmentFocus([
      {
        asset: {
          ...legacyVxusAsset,
          type: identity.effectiveType,
          isin: identity.isin ?? undefined,
        },
        value: 88,
      },
      {
        asset: {
          symbol: "SPYL.DE",
          name: "SPDR S&P 500 UCITS ETF",
          type: "etf",
          isin: "IE000XZSV718",
        },
        value: 250,
      },
    ]);
    expect(focusSummary.rows.map((r) => r.focus)).toEqual(["us", "global-ex-us"]);

    const geoSummary = calculatePortfolioGeographicExposure([
      {
        asset: {
          ...legacyVxusAsset,
          type: identity.effectiveType,
          isin: identity.isin ?? undefined,
        },
        value: 88,
      },
    ]);
    expect(geoSummary.withheldFundValue).toBe(88);

    // Non-regression: Generic, Revolut and IBKR CSV still parse and classify properly
    const generic = analyzeBrokerCsv(
      "generic",
      "symbol,type,date,quantity,price,fee,currency\nAAPL,buy,2026-01-15,2,220,1,USD\nIWDA.AS,buy,2026-01-16,3,100,0,EUR",
    );
    expect(generic.transactions.map((t) => [t.symbol, t.assetType])).toEqual([
      ["AAPL", "stock"],
      ["IWDA.AS", "etf"],
    ]);

    const revolut = analyzeBrokerCsv(
      "revolut",
      "Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate\n2026-01-15T10:00:00Z,VWCE,BUY - MARKET,1,130.00,130.00,EUR,1.0",
    );
    expect(revolut.transactions[0]).toMatchObject({
      symbol: "VWCE.DE",
      assetType: "etf",
      currency: "EUR",
    });

    const ibkr = analyzeBrokerCsv(
      "ibkr",
      "Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Comm/F\nTrades,Data,Order,Stocks,EUR,VUAA,2026-01-15,2,95.50,-1.25",
    );
    expect(ibkr.transactions[0]).toMatchObject({
      symbol: "VUAA.DE",
      assetType: "etf",
      currency: "EUR",
    });
  });
});
