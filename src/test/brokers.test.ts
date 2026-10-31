import { describe, expect, it } from "vitest";
import { parseFlexReport, parseT212Dividends, parseT212Orders } from "@/lib/brokers.server";
import { decryptBrokerCredentials, encryptBrokerCredentials } from "@/lib/broker-secrets.server";

describe("Trading 212 transaction parsing", () => {
  it("maps executed fills and dividend events while preserving provider IDs", () => {
    const orders = parseT212Orders([
      {
        fill: {
          id: 7788,
          filledAt: "2026-03-05T12:30:00Z",
          price: 212.5,
          quantity: 2,
          type: "TRADE",
          walletImpact: {
            taxes: [{ currency: "EUR", quantity: -0.75 }],
          },
        },
        order: {
          id: 123,
          side: "BUY",
          instrument: { currency: "USD", name: "Example Corp", ticker: "EXM_US_EQ" },
        },
      },
    ]);
    const dividends = parseT212Dividends([
      {
        amount: 1.2,
        currency: "EUR",
        paidOn: "2026-03-10T00:00:00Z",
        reference: "div-90",
        instrument: { name: "Example Corp", ticker: "EXM_US_EQ" },
      },
    ]);
    expect(orders).toEqual([
      expect.objectContaining({
        sourceTransactionId: "t212:fill:7788",
        symbol: "EXM_US_EQ",
        kind: "buy",
        quantity: 2,
        price: 212.5,
        fee: 0.75,
        feeCurrency: "EUR",
        currency: "USD",
      }),
    ]);
    expect(dividends).toEqual([
      expect.objectContaining({
        sourceTransactionId: "t212:dividend:div-90",
        kind: "dividend",
        quantity: 1,
        price: 1.2,
        currency: "EUR",
      }),
    ]);
  });

  it("ignores non-trade fills and stops when fee currencies cannot be represented safely", () => {
    expect(
      parseT212Orders([
        {
          fill: {
            id: 1,
            filledAt: "2026-03-05T12:30:00Z",
            price: 10,
            quantity: 1,
            type: "STOCK_SPLIT",
          },
          order: { id: 2, side: "BUY", ticker: "AAA_US_EQ" },
        },
      ]),
    ).toEqual([]);
    expect(() =>
      parseT212Orders([
        {
          fill: {
            id: 3,
            filledAt: "2026-03-05T12:30:00Z",
            price: 10,
            quantity: 1,
            type: "TRADE",
            walletImpact: {
              taxes: [
                { currency: "USD", quantity: 1 },
                { currency: "EUR", quantity: 1 },
              ],
            },
          },
          order: { id: 4, side: "SELL", instrument: { currency: "USD", name: "A", ticker: "A" } },
        },
      ]),
    ).toThrow(/multiple currencies/);
  });
});

describe("IBKR Flex report parsing", () => {
  it("maps trades and dividend cash transactions from XML", () => {
    const rows = parseFlexReport(
      '<FlexQueryResponse><FlexStatements><FlexStatement><Trades><Trade transactionID="trade-1" symbol="AAPL" description="Apple Inc." buySell="BUY" dateTime="20260305;12:30:00" quantity="2" tradePrice="212.5" ibCommission="-1" currency="USD"/></Trades><CashTransactions><CashTransaction transactionID="div-2" type="Dividends" symbol="AAPL" description="Apple Inc." dateTime="20260310" amount="1.25" currency="USD"/></CashTransactions></FlexStatement></FlexStatements></FlexQueryResponse>',
    );
    expect(rows).toEqual([
      expect.objectContaining({
        sourceTransactionId: "ibkr:trade:trade-1",
        symbol: "AAPL",
        kind: "buy",
        quantity: 2,
        price: 212.5,
        fee: 1,
        date: "2026-03-05",
      }),
      expect.objectContaining({
        sourceTransactionId: "ibkr:dividend:div-2",
        kind: "dividend",
        quantity: 1,
        price: 1.25,
        date: "2026-03-10",
      }),
    ]);
  });

  it("does not accept failed or unsupported-currency reports as importable", () => {
    expect(() =>
      parseFlexReport(
        "<FlexStatementResponse><Status>Fail</Status><ErrorMessage>Token expired</ErrorMessage></FlexStatementResponse>",
      ),
    ).toThrow(/Token expired/);
    expect(() =>
      parseFlexReport(
        '<FlexQueryResponse><Trade transactionID="x" symbol="X" buySell="BUY" dateTime="20260305" quantity="1" tradePrice="1" currency="JPY"/></FlexQueryResponse>',
      ),
    ).toThrow(/Unsupported broker currency/);
  });
});

describe("broker credential encryption", () => {
  it("round-trips credentials and rejects modified ciphertext", async () => {
    const previousKey = process.env["BROKER_CREDENTIALS_ENCRYPTION_KEY"];
    process.env["BROKER_CREDENTIALS_ENCRYPTION_KEY"] = btoa("0123456789abcdef0123456789abcdef");
    try {
      const credentials = { token: "secret-token", queryId: "12345" };
      const encrypted = await encryptBrokerCredentials(credentials);
      expect(encrypted).not.toContain(credentials.token);
      expect(await decryptBrokerCredentials(encrypted)).toEqual(credentials);
      const changed = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;
      await expect(decryptBrokerCredentials(changed)).rejects.toThrow(/could not be decrypted/);
    } finally {
      if (previousKey === undefined) delete process.env["BROKER_CREDENTIALS_ENCRYPTION_KEY"];
      else process.env["BROKER_CREDENTIALS_ENCRYPTION_KEY"] = previousKey;
    }
  });
});
