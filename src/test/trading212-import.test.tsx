import { FirstImportWizard } from "@/components/FirstImportWizard";
import {
  analyzeBrokerCsv,
  classifyTrading212Action,
  CsvPrepareError,
  MAX_CSV_BYTES,
  MAX_CSV_ROWS,
  missingTrading212Headers,
  parseBrokerCsv,
  prepareCsvFile,
  prepareCsvText,
  rejectedCsvRows,
  splitDuplicates,
  type CsvPrepareErrorCode,
} from "@/lib/csv-import";
import { languages } from "@/lib/i18n";
import { formatCsvPrepareError } from "@/lib/trust-i18n";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

afterEach(cleanup);

const T212_REAL_HEADER =
  "Action,Time (UTC),ISIN,Ticker,Name,Notes,ID,No. of shares,Price / share,Currency (Price / share),Exchange rate,Total,Currency (Total),Merchant name,Merchant category";

/**
 * Privacy-safe synthetic 35-row, 15-column reproduction matching the exact
 * Trading 212 History CSV structure:
 * - Spending cashback first
 * - 10 Market buy + 3 Limit buy = 13 eligible purchases
 * - 11 Spending cashback + 6 Card debit + 4 Interest on cash + 1 Deposit = 22 excluded rows
 */
function buildSynthetic35RowMixedCsv(): string {
  const rows: string[] = [T212_REAL_HEADER];
  // 1. Spending cashback first (real files frequently start with cashback/card rows)
  rows.push(
    'Spending cashback,2025-01-06 09:15:00,,,,Cashback reward,SYN-CB-001,,,,,0.45,EUR,"Market;One",Groceries',
  );
  // 2-11. 10 Market buy rows
  const buys = [
    [
      "2025-01-07 10:00:00",
      "IE000XZSV718",
      "SPYL",
      "SPDR S&P 500 UCITS ETF",
      "1.5",
      "13.20",
      "EUR",
    ],
    [
      "2025-01-08 10:15:00",
      "IE00BK5BQT80",
      "VWCE",
      "Vanguard FTSE All-World UCITS ETF",
      "2.0",
      "132.50",
      "EUR",
    ],
    [
      "2025-01-09 11:00:00",
      "IE00BKM4GZ66",
      "IS3N",
      "iShares Core MSCI EM IMI",
      "3.0",
      "33.10",
      "EUR",
    ],
    ["2025-01-10 14:30:00", "US0378331005", "AAPL", "Apple Inc.", "0.5", "240.00", "USD"],
    ["2025-01-13 14:45:00", "US5949181045", "MSFT", "Microsoft Corp.", "0.4", "420.00", "USD"],
    [
      "2025-01-14 09:30:00",
      "IE000XZSV718",
      "SPYL",
      "SPDR S&P 500 UCITS ETF",
      "2.5",
      "13.35",
      "EUR",
    ],
    [
      "2025-01-15 10:20:00",
      "IE00BK5BQT80",
      "VWCE",
      "Vanguard FTSE All-World UCITS ETF",
      "1.0",
      "134.00",
      "EUR",
    ],
    ["2025-01-16 15:00:00", "US0378331005", "AAPL", "Apple Inc.", "0.25", "235.00", "USD"],
    [
      "2025-01-17 15:10:00",
      "IE00BKM4GZ66",
      "IS3N",
      "iShares Core MSCI EM IMI",
      "1.5",
      "32.80",
      "EUR",
    ],
    [
      "2025-01-20 11:00:00",
      "IE000XZSV718",
      "SPYL",
      "SPDR S&P 500 UCITS ETF",
      "2.0",
      "13.50",
      "EUR",
    ],
  ] as const;
  buys.forEach(([time, isin, ticker, name, qty, price, cur], i) => {
    rows.push(
      `Market buy,${time},${isin},${ticker},${name},Synthetic buy,SYN-BUY-${i + 1},${qty},${price},${cur},1.00,${(Number(qty) * Number(price)).toFixed(2)},${cur},,`,
    );
  });
  // 12-14. 3 Limit buy rows
  for (let i = 0; i < 3; i++) {
    rows.push(
      `Limit buy,2025-01-${21 + i} 13:00:00,IE000XZSV718,SPYL,SPDR S&P 500 UCITS ETF,Synthetic limit buy,SYN-LBUY-${i + 1},1.0,13.40,EUR,1.00,13.40,EUR,,`,
    );
  }
  // 15-24. Remaining 10 Spending cashback rows (total = 11)
  for (let i = 0; i < 10; i++) {
    rows.push(
      `Spending cashback,2025-02-${String(i + 2).padStart(2, "0")} 12:00:00,,,,Cashback reward,SYN-CB-${i + 2},,,,,0.30,EUR,Synthetic Shop ${i + 2},Retail`,
    );
  }
  // 25-30. 6 Card debit rows (including unquoted semicolon in Merchant name)
  for (let i = 0; i < 6; i++) {
    rows.push(
      `Card debit,2025-02-${String(12 + i).padStart(2, "0")} 18:00:00,,,,Card purchase,SYN-CD-${i + 1},,,,,12.50,EUR,Cafe;Synthetik ${i + 1},Dining`,
    );
  }
  // 31-34. 4 Interest on cash rows
  for (let i = 0; i < 4; i++) {
    rows.push(
      `Interest on cash,2025-02-${String(20 + i).padStart(2, "0")} 01:00:00,,,,Daily cash interest,SYN-INT-${i + 1},,,,,0.18,EUR,,`,
    );
  }
  // 35. 1 Deposit row
  rows.push("Deposit,2025-01-05 08:00:00,,,,Bank transfer,SYN-DEP-1,,,,,1000.00,EUR,,");
  return rows.join("\n");
}

describe("Trading 212 CSV import repair", () => {
  it("parses the full 35-row 15-column mixed CSV with Time (UTC) and separates 13 buys from 22 excluded rows", () => {
    const csv = buildSynthetic35RowMixedCsv();
    const analysis = prepareCsvText(csv, "trading212");

    expect(analysis.format).toBe("trading212");
    expect(analysis.totalRows).toBe(35);
    expect(analysis.transactions).toHaveLength(13);
    expect(analysis.transactions.every((t) => t.kind === "buy")).toBe(true);
    expect(analysis.excluded).toHaveLength(22);
    expect(analysis.rejected).toHaveLength(0);
    expect(analysis.excludedBreakdown).toEqual([
      { action: "Spending cashback", count: 11 },
      { action: "Card debit", count: 6 },
      { action: "Interest on cash", count: 4 },
      { action: "Deposit", count: 1 },
    ]);

    expect(analysis.transactions[0]).toMatchObject({
      symbol: "SPYL.DE",
      brokerSymbol: "SPYL",
      isin: "IE000XZSV718",
      assetType: "etf",
      kind: "buy",
      quantity: 1.5,
      price: 13.2,
      currency: "EUR",
      date: "2025-01-07",
      sourceTransactionId: "t212:fill:SYN-BUY-1",
      sourceExecutedAt: "2025-01-07 10:00:00Z",
    });

    // Re-importing the exact same 35-row CSV identifies all 13 fills as duplicates
    const dupCheck = splitDuplicates(analysis.transactions, analysis.transactions);
    expect(dupCheck.fresh).toHaveLength(0);
    expect(dupCheck.duplicates).toHaveLength(13);
  });

  it("supports all verified Trading 212 BUY/SELL action variants, negative sell share counts, and per-fee currencies", () => {
    const csv = [
      "Action,Time (UTC),ISIN,Ticker,Name,ID,No. of shares,Price / share,Currency (Price / share),Exchange rate,Total,Currency (Total),Stamp duty reserve tax,Currency (Stamp duty reserve tax),Currency conversion fee,Currency (Currency conversion fee)",
      "Market sell,2025-01-15 10:00:00,US0378331005,AAPL,Apple,S1,-0.5,245.00,USD,0.95,116.38,EUR,,,0.18,EUR",
      "Limit sell,2025-01-16 11:00:00,GB0002374006,DGE,Diageo,S2,10,2500,GBX,1.00,250.00,GBP,1.25,GBP,,",
      "Stop buy,2025-01-17 12:00:00,US5949181045,MSFT,Microsoft,B1,1,425.00,USD,1.00,425.00,USD,,,,",
      "Stop sell,2025-01-18 12:00:00,US5949181045,MSFT,Microsoft,S3,0.5,430.00,USD,1.00,215.00,USD,,,,",
      "Stop limit buy,2025-01-19 12:00:00,IE000XZSV718,SPYL,SPDR S&P 500,B2,2,13.40,EUR,1.00,26.80,EUR,,,,",
      "Stop limit sell,2025-01-20 12:00:00,IE000XZSV718,SPYL,SPDR S&P 500,S4,1,13.90,EUR,1.00,13.90,EUR,,,,",
    ].join("\n");

    const analysis = analyzeBrokerCsv("trading212", csv);
    expect(analysis.excluded).toHaveLength(0);
    expect(analysis.rejected).toHaveLength(0);
    expect(analysis.feeColumns).toEqual(["Stamp duty reserve tax", "Currency conversion fee"]);
    expect(analysis.transactions.map((t) => t.kind)).toEqual([
      "sell",
      "sell",
      "buy",
      "sell",
      "buy",
      "sell",
    ]);
    expect(analysis.transactions[0]).toMatchObject({
      quantity: 0.5,
      price: 245,
      currency: "USD",
      fee: 0.18,
      feeCurrency: "EUR",
    });
    expect(analysis.transactions[1]).toMatchObject({
      symbol: "DGE",
      currency: "GBX",
      fee: 1.25,
      feeCurrency: "GBP",
    });
  });

  it("handles mixed CSVs containing only non-investment operations cleanly with zero errors", () => {
    const csv = [
      T212_REAL_HEADER,
      "Spending cashback,2025-01-05 10:00:00,,,,,C1,,,,,0.50,EUR,Grocery,Food",
      "Card debit,2025-01-06 10:00:00,,,,,C2,,,,,20.00,EUR,Cafe,Dining",
      "Card refund,2025-01-07 10:00:00,,,,,C3,,,,,5.00,EUR,Cafe,Dining",
      "Interest on cash,2025-01-08 10:00:00,,,,,C4,,,,,0.12,EUR,,",
      "Deposit,2025-01-09 10:00:00,,,,,C5,,,,,500.00,EUR,,",
      "Withdrawal,2025-01-10 10:00:00,,,,,C6,,,,,100.00,EUR,,",
      "Currency conversion,2025-01-11 10:00:00,,,,,C7,,,,,50.00,EUR,,",
      "Dividend (Ordinary),2025-01-12 10:00:00,US0378331005,AAPL,Apple,,D1,1,0.25,USD,1.0,0.25,USD,,",
    ].join("\n");

    const analysis = prepareCsvText(csv, "trading212");
    expect(analysis.transactions).toHaveLength(0);
    expect(analysis.excluded).toHaveLength(8);
    expect(analysis.rejected).toHaveLength(0);
    expect(rejectedCsvRows("trading212", csv)).toHaveLength(8);
  });

  it("does not silently discard unknown/ambiguous actions and flags invalid trade rows individually", () => {
    const csv = [
      "Action,Time (UTC),ISIN,Ticker,Name,ID,No. of shares,Price / share,Currency (Price / share),Total,Currency (Total)",
      "Market buy,2025-01-10 10:00:00,IE000XZSV718,SPYL,SPDR S&P 500,OK1,2,13.50,EUR,27.00,EUR",
      "Stock split,2025-01-11 10:00:00,US0378331005,AAPL,Apple,UNK1,4,0,USD,0,USD",
      "Stop limit,2025-01-11 11:00:00,US0378331005,AAPL,Apple,UNK2,1,200,USD,200,USD",
      "Corporate action,2025-01-12 10:00:00,US5949181045,MSFT,Microsoft,UNK3,1,1,USD,1,USD",
      ",2025-01-12 11:00:00,US5949181045,MSFT,Microsoft,UNK4,1,1,USD,1,USD",
      "Market buy,2025-01-13 10:00:00,,,Missing Ticker,INV1,1,100,USD,100,USD",
      "Market buy,2025-02-31 10:00:00,US0378331005,AAPL,Apple,INV2,1,100,USD,100,USD",
      "Market buy,2025-01-14 10:00:00,CH0012032048,ROG,Roche,INV3,1,250,CHF,250,CHF",
      "Market buy,2025-01-15 10:00:00,US0378331005,AAPL,Apple,INV4,-2,100,USD,200,USD",
    ].join("\n");

    const analysis = prepareCsvText(csv, "trading212");
    expect(analysis.transactions).toHaveLength(1);
    expect(analysis.transactions[0]?.symbol).toBe("SPYL.DE");
    expect(analysis.transactions[0]?.brokerSymbol).toBe("SPYL");
    expect(analysis.transactions[0]?.isin).toBe("IE000XZSV718");
    expect(analysis.transactions[0]?.assetType).toBe("etf");
    expect(analysis.excluded).toHaveLength(0);
    expect(analysis.rejected.map((r) => [r.row, r.reason])).toEqual([
      [3, "unknown_action"],
      [4, "unknown_action"],
      [5, "unknown_action"],
      [6, "unknown_action"],
      [7, "missing_ticker"],
      [8, "invalid_transaction"],
      [9, "unsupported_currency"],
      [10, "invalid_transaction"],
    ]);
  });

  it("distinguishes every CSV error condition safely and renders localized errors in all 5 languages", async () => {
    expect(() => prepareCsvText("")).toThrow(CsvPrepareError);
    try {
      prepareCsvText("");
    } catch (e) {
      expect((e as CsvPrepareError).code).toBe("empty_file");
    }

    try {
      prepareCsvText(`${T212_REAL_HEADER}\n`);
    } catch (e) {
      expect((e as CsvPrepareError).code).toBe("empty_file");
    }

    try {
      prepareCsvText(`${T212_REAL_HEADER}\n"Market buy,2025-01-01`);
    } catch (e) {
      expect((e as CsvPrepareError).code).toBe("malformed_csv");
    }

    try {
      prepareCsvText("foo,bar\n1,2");
    } catch (e) {
      expect((e as CsvPrepareError).code).toBe("unsupported_format");
    }

    try {
      prepareCsvText("Action,Ticker,Price / share\nMarket buy,AAPL,100", "trading212");
    } catch (e) {
      const err = e as CsvPrepareError;
      expect(err.code).toBe("missing_t212_headers");
      expect(err.missingHeaders).toEqual(["Time / Time (UTC)", "No. of shares"]);
    }

    expect(
      missingTrading212Headers([
        "Action",
        "Time (UTC)",
        "Ticker",
        "No. of shares",
        "Price / share",
      ]),
    ).toEqual([]);

    const tooManyRowsCsv = [
      T212_REAL_HEADER,
      ...Array.from(
        { length: MAX_CSV_ROWS + 1 },
        (_, i) => `Spending cashback,2025-01-05 10:00:00,,,,,ID-${i},,,,,0.10,EUR,Shop,Retail`,
      ),
    ].join("\n");
    try {
      prepareCsvText(tooManyRowsCsv, "trading212");
    } catch (e) {
      expect((e as CsvPrepareError).code).toBe("too_many_rows");
    }

    const oversizedFile = {
      size: MAX_CSV_BYTES + 1,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as File;
    await expect(prepareCsvFile(oversizedFile, "trading212")).rejects.toMatchObject({
      code: "file_too_large",
    });

    const invalidUtf8File = new File([new Uint8Array([0xff, 0xfe, 0x80, 0x81]).buffer], "bad.csv", {
      type: "text/csv",
    });
    await expect(prepareCsvFile(invalidUtf8File, "trading212")).rejects.toMatchObject({
      code: "invalid_encoding",
    });

    const invalidArrayBufferFile = {
      size: 4,
      arrayBuffer: async () => new Uint8Array([0xff, 0xfe, 0x80, 0x81]).buffer,
    } as unknown as File;
    await expect(prepareCsvFile(invalidArrayBufferFile, "trading212")).rejects.toMatchObject({
      code: "invalid_encoding",
    });

    const nulByteFile = new File([`Action,Time (UTC)\u0000`], "bin.csv", { type: "text/csv" });
    await expect(prepareCsvFile(nulByteFile, "trading212")).rejects.toMatchObject({
      code: "invalid_encoding",
    });

    const replacementCharFile = new File(["Action,Time (UTC)\uFFFD"], "corrupt.csv", {
      type: "text/csv",
    });
    await expect(prepareCsvFile(replacementCharFile, "trading212")).rejects.toMatchObject({
      code: "invalid_encoding",
    });

    const codes: CsvPrepareErrorCode[] = [
      "file_too_large",
      "too_many_rows",
      "empty_file",
      "invalid_encoding",
      "malformed_csv",
      "missing_t212_headers",
      "unsupported_format",
      "invalid_dates",
      "fx_unavailable",
      "unexpected_error",
    ];
    for (const { code: lang } of languages) {
      for (const code of codes) {
        const msg = formatCsvPrepareError(
          lang,
          new CsvPrepareError(code, { missingHeaders: ["Time / Time (UTC)"] }),
        );
        expect(msg.trim().length).toBeGreaterThan(10);
      }
      expect(formatCsvPrepareError(lang, new Error("secret user stack 12345.67"))).not.toContain(
        "12345.67",
      );
    }

    // Strict classifier check: dividend reinvestment requires review rather than silent exclusion
    expect(classifyTrading212Action("Dividend (Dividend reinvestment)").category).toBe("unknown");
    expect(classifyTrading212Action("Dividend (Ordinary)").category).toBe("excluded");
    expect(parseBrokerCsv("trading212", "Action\n")).toEqual([]);
  });

  it("auto-detects the 35-row mixed CSV in FirstImportWizard and surfaces specific dropzone errors without DB writes", async () => {
    const upload = vi.fn().mockResolvedValue(undefined);
    const create = vi.fn();
    render(
      <FirstImportWizard
        lang="en"
        brokers={[{ id: "b-t212", name: "Trading 212", format: "trading212" }]}
        onCreate={create}
        onUpload={upload}
        preparing={false}
        preview={false}
        completed={false}
      />,
    );

    const dropInput = screen.getByLabelText("Drop a broker CSV here to auto-detect");
    const badFile = new File(["Action,Ticker,Price / share\nMarket buy,SPYL,13.50"], "bad.csv", {
      type: "text/csv",
    });
    fireEvent.change(dropInput, { target: { files: [badFile] } });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/Time \/ Time \(UTC\)/),
    );
    expect(upload).not.toHaveBeenCalled();

    const goodFile = new File([buildSynthetic35RowMixedCsv()], "t212-history.csv", {
      type: "text/csv",
    });
    fireEvent.change(dropInput, { target: { files: [goodFile] } });
    await waitFor(() =>
      expect(upload).toHaveBeenCalledExactlyOnceWith("b-t212", "trading212", goodFile),
    );
    expect(create).not.toHaveBeenCalled();
  });
});
