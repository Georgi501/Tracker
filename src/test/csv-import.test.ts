import { describe, expect, it } from "vitest";
import {
  GENERIC_TEMPLATE,
  parseBrokerCsv,
  detectBrokerFormat,
  detectFeeColumns,
  reconciliationTotals,
  rejectedCsvRows,
} from "@/lib/csv-import";

describe("CSV import", () => {
  it("parses the generic template", () => {
    const r = parseBrokerCsv("generic", GENERIC_TEMPLATE);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({
      symbol: "AAPL",
      kind: "buy",
      quantity: 10,
      price: 185.2,
      date: "2024-01-15",
    });
    expect(r[1]!.assetType).toBe("crypto");
  });
  it("keeps valid rows when another transaction row is malformed", () => {
    const csv =
      "date,type,symbol,quantity,price,currency\n" +
      "2024-01-15,buy,AAPL,2,100,USD\n" +
      "not-a-date,buy,MSFT,1,200,USD\n" +
      "2024-02-01,sell,AAPL,1,110,USD\n";
    expect(parseBrokerCsv("generic", csv).map((row) => row.symbol)).toEqual(["AAPL", "AAPL"]);
  });
  it("reports rejected transaction rows with a row number and actionable reason", () => {
    const csv =
      "date,type,symbol,quantity,price,currency\n" +
      "2024-01-15,buy,AAPL,2,100,USD\n" +
      "not-a-date,buy,MSFT,1,200,USD\n" +
      "2024-02-01,interest,AAPL,1,1,USD\n" +
      "2024-02-02,buy,,1,100,USD\n";

    expect(rejectedCsvRows("generic", csv)).toEqual([
      {
        row: 3,
        raw: '"not-a-date","buy","MSFT","1","200","USD"',
        reason: "invalid_transaction",
      },
      {
        row: 4,
        raw: '"2024-02-01","interest","AAPL","1","1","USD"',
        reason: "unsupported_action",
      },
      {
        row: 5,
        raw: '"2024-02-02","buy","","1","100","USD"',
        reason: "missing_ticker",
      },
    ]);
  });
  it("does not report IBKR headers or metadata as rejected transactions", () => {
    const csv =
      "Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price\n" +
      'Trades,Data,Order,Stocks,USD,MSFT,"2024-04-02, 10:00:00",-4,420\n' +
      "Trades,Data,Other,Stocks,USD,MSFT,2024-04-03,1,420\n";

    expect(rejectedCsvRows("ibkr", csv)).toMatchObject([{ row: 3, reason: "unsupported_action" }]);
  });
  it("detects available fee columns", () => {
    const csv = "date,type,symbol,quantity,price,currency,commission\n";
    expect(detectFeeColumns("generic", csv)).toEqual(["commission"]);
    expect(detectFeeColumns("generic", "date,type,symbol,price\n")).toEqual([]);
  });
  it("maps common broker column names and preserves a separate fee currency", () => {
    const csv =
      "Transaction Date,Action,Ticker,Quantity,Unit Price,Price Currency,Commission,Commission Currency\n" +
      "2024-03-01,BUY,MSFT,2,100,USD,3,EUR\n";
    expect(detectBrokerFormat(csv)).toBe("generic");
    expect(parseBrokerCsv("generic", csv)[0]).toMatchObject({
      symbol: "MSFT",
      kind: "buy",
      quantity: 2,
      price: 100,
      fee: 3,
      currency: "USD",
      feeCurrency: "EUR",
    });
  });
  it("reports gross transaction totals and fees separately by their own currencies", () => {
    const totals = reconciliationTotals([
      {
        symbol: "AAPL",
        name: "Apple",
        assetType: "stock",
        kind: "buy",
        quantity: 2,
        price: 100,
        fee: 3,
        currency: "USD",
        feeCurrency: "EUR",
        date: "2024-01-01",
      },
    ]);
    expect(totals).toEqual([
      {
        currency: "EUR",
        buys: 0,
        sells: 0,
        dividends: 0,
        fees: 3,
        buyCount: 0,
        sellCount: 0,
        dividendCount: 0,
        feeCount: 1,
      },
      {
        currency: "USD",
        buys: 200,
        sells: 0,
        dividends: 0,
        fees: 0,
        buyCount: 1,
        sellCount: 0,
        dividendCount: 0,
        feeCount: 0,
      },
    ]);
  });
  it("parses Trading 212 buys and dividends", () => {
    const csv =
      "Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Total,Currency (Total)\n" +
      "Market buy,2024-02-01 10:00:00,US0378331005,AAPL,Apple,2,180,USD,360,USD\n" +
      "Dividend (Ordinary),2024-05-16 00:00:00,US0378331005,AAPL,Apple,2,0.25,USD,0.5,USD\n";
    const r = parseBrokerCsv("trading212", csv);
    expect(r.map((x) => x.kind)).toEqual(["buy", "dividend"]);
    expect(r[1]!.price).toBeCloseTo(0.5);
  });
  it("parses Revolut sells", () => {
    const csv =
      "Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate\n2024-03-01T10:00:00Z,TSLA,SELL - MARKET,3,USD 200,USD 600,USD,1\n";
    expect(parseBrokerCsv("revolut", csv)[0]).toMatchObject({
      symbol: "TSLA",
      kind: "sell",
      quantity: 3,
      price: 200,
    });
  });
  it("parses IBKR trades (negative qty = sell)", () => {
    const csv =
      "Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price\n" +
      'Trades,Data,Order,Stocks,USD,MSFT,"2024-04-02, 10:00:00",-4,420\n';
    expect(parseBrokerCsv("ibkr", csv)[0]).toMatchObject({
      symbol: "MSFT",
      kind: "sell",
      quantity: 4,
      price: 420,
    });
  });
});

it("does not invent exchange rates for EUR imports", () => {
  expect(
    parseBrokerCsv(
      "generic",
      "date,type,symbol,quantity,price,currency\n2026-01-01,buy,VWCE.DE,1,100,EUR",
    )[0],
  ).toMatchObject({ price: 100, currency: "EUR" });
});

it("detects Trading 212, IBKR and Revolut headers", () => {
  expect(detectBrokerFormat("Action,Ticker,Price / share\nBuy,AAPL,100")).toBe("trading212");
  expect(detectBrokerFormat("Trades,Header,Symbol\nTrades,Data,AAPL")).toBe("ibkr");
  expect(detectBrokerFormat("Type,Ticker,Price per share\nBUY,AAPL,100")).toBe("revolut");
});
it.each(["USD", "EUR", "BGN", "GBX"])("preserves %s amounts for dated conversion", (currency) => {
  expect(
    parseBrokerCsv(
      "generic",
      `date,type,symbol,quantity,price,currency\n2024-01-01,buy,AAPL,1,100,${currency}`,
    )[0],
  ).toMatchObject({ price: 100, currency });
});
