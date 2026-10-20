import { describe, expect, it } from "vitest";
import { GENERIC_TEMPLATE, parseBrokerCsv, detectBrokerFormat } from "@/lib/csv-import";

describe("CSV import", () => {
  it("parses the generic template", () => {
    const r = parseBrokerCsv("generic", GENERIC_TEMPLATE);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ symbol: "AAPL", kind: "buy", quantity: 10, price: 185.2, date: "2024-01-15" });
    expect(r[1]!.assetType).toBe("crypto");
  });
  it("parses Trading 212 buys and dividends", () => {
    const csv = 'Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Total,Currency (Total)\n' +
      'Market buy,2024-02-01 10:00:00,US0378331005,AAPL,Apple,2,180,USD,360,USD\n' +
      'Dividend (Ordinary),2024-05-16 00:00:00,US0378331005,AAPL,Apple,2,0.25,USD,0.5,USD\n';
    const r = parseBrokerCsv("trading212", csv);
    expect(r.map((x) => x.kind)).toEqual(["buy", "dividend"]);
    expect(r[1]!.price).toBeCloseTo(0.5);
  });
  it("parses Revolut sells", () => {
    const csv = "Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate\n2024-03-01T10:00:00Z,TSLA,SELL - MARKET,3,USD 200,USD 600,USD,1\n";
    expect(parseBrokerCsv("revolut", csv)[0]).toMatchObject({ symbol: "TSLA", kind: "sell", quantity: 3, price: 200 });
  });
  it("parses IBKR trades (negative qty = sell)", () => {
    const csv = 'Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price\n' +
      'Trades,Data,Order,Stocks,USD,MSFT,"2024-04-02, 10:00:00",-4,420\n';
    expect(parseBrokerCsv("ibkr", csv)[0]).toMatchObject({ symbol: "MSFT", kind: "sell", quantity: 4, price: 420 });
  });
});

it("does not invent exchange rates for EUR imports", () => { expect(parseBrokerCsv("generic", "date,type,symbol,quantity,price,currency\n2026-01-01,buy,VWCE.DE,1,100,EUR")[0]).toMatchObject({ price: 100, currency: "EUR" }); });

it("detects Trading 212, IBKR and Revolut headers", () => {
  expect(detectBrokerFormat("Action,Ticker,Price / share\nBuy,AAPL,100")).toBe("trading212");
  expect(detectBrokerFormat("Trades,Header,Symbol\nTrades,Data,AAPL")).toBe("ibkr");
  expect(detectBrokerFormat("Type,Ticker,Price per share\nBUY,AAPL,100")).toBe("revolut");
});
it.each(["USD", "EUR", "BGN", "GBX"])("preserves %s amounts for dated conversion", (currency) => {
  expect(parseBrokerCsv("generic", `date,type,symbol,quantity,price,currency\n2024-01-01,buy,AAPL,1,100,${currency}`)[0]).toMatchObject({ price: 100, currency });
});
