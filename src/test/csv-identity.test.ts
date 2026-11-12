import { describe, expect, it } from "vitest";
import {
  existingImportTransactions,
  parseBrokerCsv,
  splitDuplicates,
  type ImportedTx,
} from "@/lib/csv-import";

const trade = (extra: Partial<ImportedTx> = {}): ImportedTx => ({
  symbol: "AAPL",
  name: "Apple",
  assetType: "stock",
  kind: "buy",
  quantity: 2,
  price: 180,
  date: "2024-02-01",
  ...extra,
});
const t212 = (rows: string) =>
  parseBrokerCsv(
    "trading212",
    "Action,Time,ID,Ticker,Name,No. of shares,Price / share,Currency (Price / share)\n" + rows,
  );

describe("broker transaction identity", () => {
  it("retains two Trading 212 executions and skips both on repeat import", () => {
    const rows = t212(
      "Market buy,2024-02-01 10:00:00,101,AAPL,Apple,2,180,USD\n" +
        "Market buy,2024-02-01 11:00:00,102,AAPL,Apple,2,180,USD\n",
    );
    expect(rows).toMatchObject([
      { sourceTransactionId: "t212:fill:101", sourceExecutedAt: "2024-02-01 10:00:00" },
      { sourceTransactionId: "t212:fill:102", sourceExecutedAt: "2024-02-01 11:00:00" },
    ]);
    expect(splitDuplicates(rows, []).fresh).toEqual(rows);
    expect(splitDuplicates(rows, rows).duplicates).toEqual(rows);
  });

  it("treats different IDs as separate trades even at the same time and price", () => {
    const first = trade({ sourceTransactionId: "first", sourceExecutedAt: "2024-02-01 10:00:00" });
    const second = { ...first, sourceTransactionId: "second" };
    expect(splitDuplicates([first, second], []).fresh).toEqual([first, second]);
    expect(splitDuplicates([second], [first]).fresh).toEqual([second]);
  });

  it("uses an identical ID even when the economic data or time changed", () => {
    const existing = trade({ sourceTransactionId: "same" });
    const row = trade({
      sourceTransactionId: "same",
      price: 181,
      sourceExecutedAt: "2024-02-01 11:00:00",
    });
    expect(splitDuplicates([row], [existing]).duplicates).toEqual([row]);
    expect(splitDuplicates([existing, row], []).duplicates).toEqual([row]);
  });

  it("keeps different known execution times separate without IDs", () => {
    const first = trade({ sourceExecutedAt: "2024-02-01 10:00:00" });
    const second = trade({ sourceExecutedAt: "2024-02-01 11:00:00" });
    expect(splitDuplicates([first, second], []).fresh).toEqual([first, second]);
    expect(splitDuplicates([first, second], [first, second]).duplicates).toEqual([first, second]);
  });

  it("keeps date-only legacy matches reviewable when identity is unavailable", () => {
    const row = trade({ sourceTransactionId: "new", sourceExecutedAt: "2024-02-01 11:00:00" });
    expect(splitDuplicates([row], [trade()]).duplicates).toEqual([row]);
  });

  it("does not drop identity when comparing dated FX-normalized amounts", () => {
    const first = trade({ sourceTransactionId: "one", price: 100, currency: "EUR" });
    const second = trade({ ...first, sourceTransactionId: "two" });
    const normalized = [first, second].map((row) => ({ ...row, price: 109.2, currency: "USD" }));
    expect(splitDuplicates([first, second], [], normalized).fresh).toEqual([first, second]);
    expect(splitDuplicates([second], [normalized[1]!], [normalized[1]!]).duplicates).toEqual([
      second,
    ]);
  });

  it("scopes both IDs and legacy comparisons to the selected account", () => {
    const assets = [{ id: "asset", symbol: "AAPL" }];
    const row = trade({ sourceTransactionId: "same", sourceExecutedAt: "2024-02-01 10:00:00" });
    const transactions = [
      {
        id: "tx",
        assetId: "asset",
        brokerId: "account-a",
        kind: row.kind,
        quantity: row.quantity,
        price: row.price,
        date: row.date,
        sourceTransactionId: "same",
        sourceExecutedAt: "2024-02-01 10:00:00",
      },
    ];
    const selected = existingImportTransactions(transactions, assets, "account-a");
    expect(selected[0]).toMatchObject({
      symbol: "AAPL",
      sourceTransactionId: "same",
      sourceExecutedAt: row.sourceExecutedAt,
    });
    expect(splitDuplicates([row], selected).duplicates).toEqual([row]);
    expect(
      splitDuplicates([row], existingImportTransactions(transactions, assets, "account-b")).fresh,
    ).toEqual([row]);
    expect(
      splitDuplicates([trade()], existingImportTransactions(transactions, assets, "account-b"))
        .fresh,
    ).toHaveLength(1);
  });

  it("does not assign brokerless manual entries to an imported account", () => {
    expect(
      existingImportTransactions(
        [
          {
            id: "manual",
            assetId: "asset",
            kind: "buy",
            quantity: 2,
            price: 180,
            date: "2024-02-01",
          },
        ],
        [{ id: "asset", symbol: "AAPL" }],
        "account",
      ),
    ).toEqual([]);
  });

  it("retains an IBKR trade ID and the full execution time", () => {
    const rows = parseBrokerCsv(
      "ibkr",
      "Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Trade ID\n" +
        'Trades,Data,Order,Stocks,USD,AAPL,"2024-02-01, 10:00:00",2,180,991\n',
    );
    expect(rows[0]).toMatchObject({
      sourceTransactionId: "ibkr:trade:991",
      sourceExecutedAt: "2024-02-01 10:00:00",
    });
  });

  it("does not use an order ID as an IBKR execution ID", () => {
    const rows = parseBrokerCsv(
      "ibkr",
      "Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Order ID\n" +
        'Trades,Data,Order,Stocks,USD,AAPL,"2024-02-01, 10:00:00",2,180,991\n',
    );
    expect(rows[0]?.sourceTransactionId).toBeUndefined();
  });

  it("preserves an explicit source transaction ID in a generic CSV", () => {
    const rows = parseBrokerCsv(
      "generic",
      "date,type,symbol,quantity,price,source_transaction_id\n2024-02-01T10:00:00Z,buy,AAPL,2,180,original-id\n",
    );
    expect(rows[0]).toMatchObject({
      sourceTransactionId: "original-id",
      sourceExecutedAt: "2024-02-01 10:00:00Z",
    });
  });

  it("retains Revolut identity and does not invent time for date-only rows", () => {
    const rows = parseBrokerCsv(
      "revolut",
      "Date,Ticker,Type,Quantity,Price per share,Currency,Transaction ID\n2024-02-01,AAPL,BUY,2,180,USD,123\n",
    );
    expect(rows[0]?.sourceTransactionId).toBe("revolut:transaction:123");
    expect(rows[0]?.sourceExecutedAt).toBeUndefined();
  });
});
