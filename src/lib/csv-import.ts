import type { AssetType, TxKind, Transaction } from "./portfolio";
import {
  canonicalIdentityKey,
  guessInstrumentAssetType,
  resolveImportedInstrument,
} from "./instrument-identity";
import { isValidIsoDate } from "./history";

export type BrokerFormat = "generic" | "trading212" | "ibkr" | "revolut";
export const BROKER_FORMATS: { id: BrokerFormat; label: string }[] = [
  { id: "generic", label: "Generic template" },
  { id: "trading212", label: "Trading 212" },
  { id: "ibkr", label: "Interactive Brokers" },
  { id: "revolut", label: "Revolut" },
];

export interface ImportedTx {
  sourceTransactionId?: string | undefined;
  sourceExecutedAt?: string | undefined; // Provider time, without inventing a timezone.
  symbol: string;
  brokerSymbol?: string | undefined;
  isin?: string | undefined;
  name: string;
  assetType: AssetType;
  kind: TxKind;
  quantity: number;
  price: number; // per unit in USD; for dividend: total amount in USD (quantity = 1)
  fee?: number | undefined; // in original currency until server conversion
  date: string; // YYYY-MM-DD
  currency?: string | undefined; // original price currency; converted on server before storing
  feeCurrency?: string | undefined;
  bondCouponRate?: number | undefined;
  bondMaturityDate?: string | undefined;
  bondFaceValue?: number | undefined;
  bondManualPrice?: number | undefined;
}

export const MAX_CSV_BYTES = 10 * 1024 * 1024;
export const MAX_CSV_ROWS = 10_000;
const SUPPORTED_CURRENCIES = ["USD", "EUR", "BGN", "GBX", "GBP"] as const;
const FEE_HEADER_RE = /fee|commission|comm\/?f|stamp duty|levy|charge/i;

export type CsvPrepareErrorCode =
  | "file_too_large"
  | "too_many_rows"
  | "empty_file"
  | "invalid_encoding"
  | "malformed_csv"
  | "missing_t212_headers"
  | "unsupported_format"
  | "invalid_dates"
  | "fx_unavailable"
  | "unexpected_error";

export class CsvPrepareError extends Error {
  readonly code: CsvPrepareErrorCode;
  readonly missingHeaders?: readonly string[] | undefined;

  constructor(code: CsvPrepareErrorCode, options?: { missingHeaders?: readonly string[] }) {
    super(code);
    this.name = "CsvPrepareError";
    this.code = code;
    this.missingHeaders = options?.missingHeaders;
  }
}

export interface CsvRejection {
  row: number;
  raw: string;
  action?: string | undefined;
  reason:
    | "unsupported_action"
    | "unknown_action"
    | "missing_ticker"
    | "unsupported_currency"
    | "invalid_transaction";
}

export interface CsvExcludedRow {
  row: number;
  action: string;
  date?: string | undefined;
  reason: "non_investment_operation";
}

export interface CsvAnalysisResult {
  format: BrokerFormat;
  totalRows: number;
  transactions: ImportedTx[];
  excluded: CsvExcludedRow[];
  excludedBreakdown: { action: string; count: number }[];
  rejected: CsvRejection[];
  feeColumns: string[];
}

export interface ReconciliationTotals {
  currency: string;
  buys: number;
  sells: number;
  dividends: number;
  fees: number;
  buyCount: number;
  sellCount: number;
  dividendCount: number;
  feeCount: number;
}

export function reconciliationTotals(rows: ImportedTx[]): ReconciliationTotals[] {
  const totals = new Map<string, ReconciliationTotals>();
  const totalFor = (currency: string) => {
    const current = totals.get(currency);
    if (current) return current;
    const created = {
      currency,
      buys: 0,
      sells: 0,
      dividends: 0,
      fees: 0,
      buyCount: 0,
      sellCount: 0,
      dividendCount: 0,
      feeCount: 0,
    };
    totals.set(currency, created);
    return created;
  };
  for (const row of rows) {
    const currency = row.currency ?? "USD";
    const current = totalFor(currency);
    const gross = row.kind === "dividend" ? row.price : row.quantity * row.price;
    if (row.kind === "buy") {
      current.buys += gross;
      current.buyCount += 1;
    } else if (row.kind === "sell") {
      current.sells += gross;
      current.sellCount += 1;
    } else {
      current.dividends += gross;
      current.dividendCount += 1;
    }
    const fee = row.fee ?? 0;
    if (fee > 0) {
      const feeTotal = totalFor(row.feeCurrency ?? currency);
      feeTotal.fees += fee;
      feeTotal.feeCount += 1;
    }
  }
  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export const GENERIC_TEMPLATE =
  "date,type,symbol,name,asset_type,quantity,price,fee,currency\n" +
  "2024-01-15,buy,AAPL,Apple Inc.,stock,10,185.20,0,USD\n" +
  "2024-03-01,buy,BTC,Bitcoin,crypto,0.05,62000,0,USD\n" +
  "2024-05-16,dividend,AAPL,Apple Inc.,stock,1,2.50,0,USD\n";

const toUsd = (v: number, _cur?: string) => v;
const currency = (cur: string) => {
  const c = (cur || "USD").trim().toUpperCase();
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(c))
    throw new Error(`Unsupported currency: ${c}`);
  return c;
};
const isSupportedCurrency = (cur: string): boolean =>
  (SUPPORTED_CURRENCIES as readonly string[]).includes(cur.trim().toUpperCase());

const isCurrencyDescriptorHeader = (header: string): boolean => {
  const h = header.trim().toLowerCase();
  return (
    h === "currency" ||
    h.startsWith("currency (") ||
    /\bcurrency$/.test(h) ||
    h === "currencyfee" ||
    h === "feecurrency"
  );
};

const stripBom = (text: string) => text.replace(/^\uFEFF/, "");

export async function decodeCsvFile(file: File): Promise<string> {
  if (file.size > MAX_CSV_BYTES) throw new CsvPrepareError("file_too_large");
  let text: string;
  if (typeof file.arrayBuffer === "function") {
    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > MAX_CSV_BYTES) throw new CsvPrepareError("file_too_large");
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new CsvPrepareError("invalid_encoding");
    }
  } else if (typeof FileReader !== "undefined") {
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        reader.result instanceof ArrayBuffer
          ? resolve(reader.result)
          : reject(new CsvPrepareError("unexpected_error"));
      reader.onerror = () => reject(new CsvPrepareError("unexpected_error"));
      reader.readAsArrayBuffer(file);
    });
    if (buffer.byteLength > MAX_CSV_BYTES) throw new CsvPrepareError("file_too_large");
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new CsvPrepareError("invalid_encoding");
    }
  } else if (typeof file.text === "function") {
    text = await file.text();
  } else {
    throw new CsvPrepareError("unexpected_error");
  }
  if (text.includes("\u0000") || text.includes("\uFFFD")) {
    throw new CsvPrepareError("invalid_encoding");
  }
  return text;
}

function detectDelimiter(cleanText: string): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;
  let sawContent = false;
  for (let i = 0; i < cleanText.length; i++) {
    const c = cleanText[i]!;
    if (inQuotes) {
      if (c === '"' && cleanText[i + 1] === '"') i++;
      else if (c === '"') inQuotes = false;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      sawContent = true;
    } else if (c === "\n" || c === "\r") {
      if (sawContent) break;
    } else {
      if (c.trim() !== "") sawContent = true;
      if (c === ",") commas++;
      else if (c === ";") semicolons++;
    }
  }
  if (commas > 0 && commas >= semicolons) return ",";
  if (semicolons > 0) return ";";
  return ",";
}

export function parseCsvRowsStrict(text: string): { rows: string[][]; unclosedQuote: boolean } {
  const clean = stripBom(text);
  const delimiter = detectDelimiter(clean);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]!;
    if (q) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return {
    rows: rows.map((r) => r.map((x) => x.trim())),
    unclosedQuote: q,
  };
}

export function parseCsvRows(text: string): string[][] {
  return parseCsvRowsStrict(text).rows;
}

export function parseFiniteNumber(s: string): number | null {
  const stripped = s
    .trim()
    .replace(/^([+-])\s*[$€£]\s*/, "$1")
    .replace(/^[$€£]\s*/, "")
    .replace(/^(?:[A-Z]{3})\s+/i, "")
    .replace(/\s*(?:[A-Z]{3}|[$€£])$/i, "")
    .replace(/\s+/g, "");
  if (!stripped || !/\d/.test(stripped)) return null;
  if (!/^[+-]?[\d.,]+$/.test(stripped)) return null;
  let v = stripped;
  if (v.includes(",") && v.includes("."))
    v =
      v.lastIndexOf(",") > v.lastIndexOf(".")
        ? v.replace(/\./g, "").replace(",", ".")
        : v.replace(/,/g, "");
  else if (v.includes(",")) v = v.replace(",", ".");
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : null;
}

function table(text: string) {
  const [head, ...body] = parseCsvRows(text);
  const h = (head ?? []).map((x) => x.toLowerCase());
  return body.map((r) => {
    const getter = ((k: string) => {
      const i = h.indexOf(k.toLowerCase());
      return i >= 0 ? (r[i] ?? "") : "";
    }) as ((key: string) => string) & { sum: (pattern: RegExp) => number };
    getter.sum = (pattern) =>
      r.reduce(
        (sum, cell, index) =>
          pattern.test(h[index] ?? "") && !/currency/i.test(h[index] ?? "")
            ? sum + Math.abs(num(cell))
            : sum,
        0,
      );
    return getter;
  });
}
const num = (s: string) => parseFiniteNumber(s) ?? 0;
const day = (s: string) => {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const value = `${m[1]}-${m[2]}-${m[3]}`;
    if (isValidIsoDate(value)) return value;
  }
  const d = s.match(/(\d{2})[./](\d{2})[./](\d{4})/);
  if (d) {
    const value = `${d[3]}-${d[2]}-${d[1]}`;
    if (isValidIsoDate(value)) return value;
  }
  throw new Error(`Invalid transaction date: ${s}`);
};
const executionTime = (value: string): string | undefined =>
  /\d{2}:\d{2}/.test(value) ? value.trim().replace(/^(\d{4}-\d{2}-\d{2})[T, ]+/, "$1 ") : undefined;
const sourceIdentity = (id: string, prefix: string, time: string) => ({
  ...(id.trim() ? { sourceTransactionId: prefix + id.trim() } : {}),
  ...(executionTime(time) ? { sourceExecutedAt: executionTime(time) } : {}),
});
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;
const cleanIsin = (raw: string | undefined): string | undefined => {
  const v = raw?.trim().toUpperCase() ?? "";
  return ISIN_RE.test(v) ? v : undefined;
};
const parseSafely = (parse: () => ImportedTx[]) => {
  try {
    return parse();
  } catch {
    return [];
  }
};

function generic(text: string): ImportedTx[] {
  const rows = parseCsvRows(text);
  const headers = (rows[0] ?? []).map((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ""));
  const aliases: Record<string, string[]> = {
    date: ["date", "datetime", "tradedate", "transactiondate", "transactiondateutc", "time"],
    type: ["type", "action", "side", "transactiontype", "activity"],
    symbol: ["symbol", "ticker", "isin", "instrument", "asset", "product"],
    isin: ["isin"],
    name: ["name", "description", "company", "securityname"],
    asset_type: ["assettype", "securitytype"],
    quantity: ["quantity", "qty", "shares", "units", "noofshares"],
    price: ["price", "unitprice", "pricepershare", "priceperunit", "executionprice"],
    currency: ["currency", "pricecurrency", "settlementcurrency"],
    fee: ["fee", "fees", "commission", "transactionfee", "commissionamount"],
    source_id: ["sourcetransactionid", "transactionid", "tradeid", "executionid", "id"],
  };
  const value = (row: string[], key: string) => {
    const index = headers.findIndex((header) => aliases[key]?.includes(header));
    return index >= 0 ? (row[index] ?? "") : "";
  };
  return rows.slice(1).flatMap((row) => {
    return parseSafely(() => {
      const kind = value(row, "type").toLowerCase() as TxKind;
      if (!["buy", "sell", "dividend"].includes(kind)) return [];
      const rawSymbol = value(row, "symbol").toUpperCase();
      const rawIsin = cleanIsin(value(row, "isin")) ?? cleanIsin(rawSymbol);
      const rawName = value(row, "name") || rawSymbol;
      const cur = currency(value(row, "currency"));
      const explicitTypeRaw = value(row, "asset_type").trim();
      const declaredType = explicitTypeRaw ? (explicitTypeRaw as AssetType) : undefined;
      const resolved = resolveImportedInstrument({
        symbol: rawSymbol,
        isin: rawIsin,
        name: rawName,
        currency: cur,
        declaredType,
      });
      const at = explicitTypeRaw
        ? guessInstrumentAssetType({
            symbol: resolved.quoteSymbol,
            isin: rawIsin,
            name: rawName,
            declaredType,
          })
        : resolved.effectiveType;
      const feeCurrencyValue = headers
        .map((header, index) => ({ header, index }))
        .find(({ header }) =>
          [
            "feecurrency",
            "currencyfee",
            "currencytransactionfee",
            "transactionfeecurrency",
            "commissioncurrency",
          ].includes(header),
        );
      const feeCurrency = feeCurrencyValue ? currency(row[feeCurrencyValue.index] ?? cur) : cur;
      const fee = headers.reduce(
        (sum, header, index) =>
          /fee|commission|comm\/?f|stampduty|levy|charge/i.test(header) &&
          !header.includes("currency")
            ? sum + Math.abs(num(row[index] ?? ""))
            : sum,
        0,
      );
      const resolvedSymbol = resolved.quoteSymbol;
      return [
        {
          symbol: resolvedSymbol,
          ...(resolvedSymbol !== rawSymbol ? { brokerSymbol: rawSymbol } : {}),
          ...(rawIsin ? { isin: rawIsin } : {}),
          ...sourceIdentity(value(row, "source_id"), "", value(row, "date")),
          name: rawName,
          assetType: at,
          kind,
          quantity: kind === "dividend" ? 1 : num(value(row, "quantity")),
          price: toUsd(
            num(value(row, "price")) *
              (kind === "dividend" ? Math.max(num(value(row, "quantity")), 1) : 1),
            cur,
          ),
          fee,
          feeCurrency,
          date: day(value(row, "date")),
          currency: cur,
        },
      ];
    });
  });
}

type T212ActionClassification =
  | { category: "trade"; kind: "buy" | "sell" }
  | { category: "excluded"; actionLabel: string }
  | { category: "unknown"; actionLabel: string };

const T212_BUY_ACTIONS = new Set(["market buy", "limit buy", "stop buy", "stop limit buy", "buy"]);
const T212_SELL_ACTIONS = new Set([
  "market sell",
  "limit sell",
  "stop sell",
  "stop limit sell",
  "sell",
]);
const T212_EXCLUDED_ACTIONS = new Set([
  "spending cashback",
  "cashback",
  "card debit",
  "card credit",
  "card refund",
  "card payment",
  "card purchase",
  "card withdrawal",
  "card atm withdrawal",
  "card deposit",
  "card top-up",
  "card top up",
  "interest on cash",
  "lending interest",
  "interest",
  "deposit",
  "withdrawal",
  "currency conversion",
  "currency exchange",
  "cash transfer",
  "internal transfer",
  "pie cash deposit",
  "pie cash withdrawal",
  "bonus",
  "promo",
  "referral bonus",
  "fee",
  "account fee",
  "custody fee",
  "inactivity fee",
  "tax",
  "withholding tax",
  "dividend",
  "dividend adjustment",
]);
const T212_CARD_ACTION_RE =
  /^card\s+(?:debit|credit|refund|payment|purchase|withdrawal|atm withdrawal|deposit|top[- ]?up|fee|settlement|reversal)$/;
const T212_DIVIDEND_ACTION_RE = /^dividend\s*\((?![^)]*reinvestment)[^)]+\)$/;

export function classifyTrading212Action(rawAction: string): T212ActionClassification {
  const trimmed = rawAction.trim().replace(/\s+/g, " ");
  const normalized = trimmed.toLowerCase();
  if (T212_BUY_ACTIONS.has(normalized)) return { category: "trade", kind: "buy" };
  if (T212_SELL_ACTIONS.has(normalized)) return { category: "trade", kind: "sell" };
  if (
    T212_EXCLUDED_ACTIONS.has(normalized) ||
    T212_CARD_ACTION_RE.test(normalized) ||
    T212_DIVIDEND_ACTION_RE.test(normalized)
  ) {
    return {
      category: "excluded",
      actionLabel: trimmed || "Non-investment operation",
    };
  }
  return {
    category: "unknown",
    actionLabel: trimmed || "(empty)",
  };
}

function findTrading212TimeIndex(lowerHeaders: string[]): number {
  const utcIdx = lowerHeaders.indexOf("time (utc)");
  if (utcIdx >= 0) return utcIdx;
  const plainIdx = lowerHeaders.indexOf("time");
  if (plainIdx >= 0) return plainIdx;
  return lowerHeaders.findIndex((header) => /^time\s*\([^)]+\)$/.test(header));
}

export function missingTrading212Headers(headers: readonly string[]): string[] {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const missing: string[] = [];
  if (!lower.includes("action")) missing.push("Action");
  if (findTrading212TimeIndex(lower) < 0) missing.push("Time / Time (UTC)");
  if (!lower.includes("ticker")) missing.push("Ticker");
  if (!lower.includes("no. of shares")) missing.push("No. of shares");
  if (!lower.includes("price / share")) missing.push("Price / share");
  return missing;
}

function hasTrading212Signature(lowerHeaders: string[]): boolean {
  const indicators = [
    "action",
    "time (utc)",
    "isin",
    "no. of shares",
    "price / share",
    "currency (price / share)",
    "exchange rate",
    "currency (total)",
    "merchant name",
    "merchant category",
  ];
  return indicators.filter((col) => lowerHeaders.includes(col)).length >= 2;
}

const csvRowText = (row: string[]) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");

function analyzeTrading212FromRows(rows: string[][]): CsvAnalysisResult {
  const [head = [], ...body] = rows;
  const lowerHead = head.map((h) => h.toLowerCase());
  const timeIdx = findTrading212TimeIndex(lowerHead);
  const colIndex = (name: string) => lowerHead.indexOf(name.toLowerCase());
  const actionIdx = colIndex("action");
  const isinIdx = colIndex("isin");
  const tickerIdx = colIndex("ticker");
  const nameIdx = colIndex("name");
  const idIdx = colIndex("id");
  const sharesIdx = colIndex("no. of shares");
  const priceIdx = colIndex("price / share");
  const priceCurrencyIdx = colIndex("currency (price / share)");
  const txFeeCurrencyIdx = colIndex("currency (transaction fee)");
  const totalCurrencyIdx = colIndex("currency (total)");

  const feeColumnIndexes = lowerHead.reduce<number[]>((acc, header, index) => {
    if (FEE_HEADER_RE.test(header) && !isCurrencyDescriptorHeader(header)) acc.push(index);
    return acc;
  }, []);

  const transactions: ImportedTx[] = [];
  const excluded: CsvExcludedRow[] = [];
  const rejected: CsvRejection[] = [];
  const breakdownCounts = new Map<string, { label: string; count: number }>();

  const recordBreakdown = (label: string) => {
    const key = label.toLowerCase();
    const existing = breakdownCounts.get(key);
    if (existing) existing.count += 1;
    else breakdownCounts.set(key, { label, count: 1 });
  };

  for (let i = 0; i < body.length; i++) {
    const r = body[i]!;
    const rowNumber = i + 2;
    const cell = (idx: number) => (idx >= 0 ? (r[idx] ?? "").trim() : "");
    const rawAction = cell(actionIdx);
    const timeValue = cell(timeIdx);
    const classification = classifyTrading212Action(rawAction);

    if (classification.category === "excluded") {
      let excludedDate: string | undefined;
      try {
        excludedDate = timeValue ? day(timeValue) : undefined;
      } catch {
        excludedDate = undefined;
      }
      excluded.push({
        row: rowNumber,
        action: classification.actionLabel,
        ...(excludedDate ? { date: excludedDate } : {}),
        reason: "non_investment_operation",
      });
      recordBreakdown(classification.actionLabel);
      continue;
    }

    if (classification.category === "unknown") {
      rejected.push({
        row: rowNumber,
        raw: csvRowText(r),
        action: classification.actionLabel,
        reason: "unknown_action",
      });
      continue;
    }

    const symbol = cell(tickerIdx).toUpperCase();
    if (!symbol) {
      rejected.push({
        row: rowNumber,
        raw: csvRowText(r),
        action: rawAction,
        reason: "missing_ticker",
      });
      continue;
    }
    if (!/^[A-Z0-9.^:=_-]{1,20}$/i.test(symbol)) {
      rejected.push({
        row: rowNumber,
        raw: csvRowText(r),
        action: rawAction,
        reason: "invalid_transaction",
      });
      continue;
    }

    let parsedDate: string;
    try {
      parsedDate = day(timeValue);
    } catch {
      rejected.push({
        row: rowNumber,
        raw: csvRowText(r),
        action: rawAction,
        reason: "invalid_transaction",
      });
      continue;
    }

    const rawQty = parseFiniteNumber(cell(sharesIdx));
    const quantity =
      rawQty === null
        ? 0
        : classification.kind === "sell"
          ? Math.abs(rawQty)
          : rawQty > 0
            ? rawQty
            : 0;
    const rawPrice = parseFiniteNumber(cell(priceIdx));
    const price = rawPrice !== null && rawPrice > 0 ? rawPrice : 0;

    if (quantity <= 0 || price <= 0) {
      rejected.push({
        row: rowNumber,
        raw: csvRowText(r),
        action: rawAction,
        reason: "invalid_transaction",
      });
      continue;
    }

    let tradeCurrency = "USD";
    if (priceCurrencyIdx >= 0) {
      const rawCur = cell(priceCurrencyIdx);
      if (!rawCur) {
        rejected.push({
          row: rowNumber,
          raw: csvRowText(r),
          action: rawAction,
          reason: "invalid_transaction",
        });
        continue;
      }
      if (!isSupportedCurrency(rawCur)) {
        rejected.push({
          row: rowNumber,
          raw: csvRowText(r),
          action: rawAction,
          reason: "unsupported_currency",
        });
        continue;
      }
      tradeCurrency = rawCur.toUpperCase();
    }

    let feeSum = 0;
    let resolvedFeeCurrency: string | undefined;
    let feeFailure: CsvRejection["reason"] | null = null;

    for (const feeIdx of feeColumnIndexes) {
      const rawFee = cell(feeIdx);
      if (!rawFee) continue;
      const parsedFee = parseFiniteNumber(rawFee);
      if (parsedFee === null) {
        feeFailure = "invalid_transaction";
        break;
      }
      const absFee = Math.abs(parsedFee);
      if (absFee === 0) continue;

      const pairedCurIdx = colIndex(`currency (${lowerHead[feeIdx]!})`);
      const rawFeeCur =
        cell(pairedCurIdx) || cell(txFeeCurrencyIdx) || cell(totalCurrencyIdx) || tradeCurrency;
      if (!isSupportedCurrency(rawFeeCur)) {
        feeFailure = "unsupported_currency";
        break;
      }
      const feeCur = rawFeeCur.toUpperCase();
      if (resolvedFeeCurrency && resolvedFeeCurrency !== feeCur) {
        feeFailure = "invalid_transaction";
        break;
      }
      resolvedFeeCurrency = feeCur;
      feeSum += absFee;
    }

    if (feeFailure) {
      rejected.push({
        row: rowNumber,
        raw: csvRowText(r),
        action: rawAction,
        reason: feeFailure,
      });
      continue;
    }

    const rawName = (cell(nameIdx) || symbol).slice(0, 200);
    const isin = cleanIsin(cell(isinIdx));
    const resolved = resolveImportedInstrument({
      symbol,
      isin,
      name: rawName,
      currency: tradeCurrency,
    });
    const resolvedSymbol = resolved.quoteSymbol;
    transactions.push({
      symbol: resolvedSymbol,
      ...(resolvedSymbol !== symbol ? { brokerSymbol: symbol } : {}),
      ...(isin ? { isin } : {}),
      name: rawName,
      assetType: resolved.effectiveType,
      kind: classification.kind,
      quantity,
      price: toUsd(price, tradeCurrency),
      fee: feeSum,
      feeCurrency: resolvedFeeCurrency ?? tradeCurrency,
      date: parsedDate,
      currency: tradeCurrency,
      ...sourceIdentity(cell(idIdx), "t212:fill:", timeValue),
    });
  }

  const excludedBreakdown = [...breakdownCounts.values()]
    .map(({ label, count }) => ({ action: label, count }))
    .sort((a, b) => b.count - a.count || a.action.localeCompare(b.action));

  return {
    format: "trading212",
    totalRows: body.length,
    transactions,
    excluded,
    excludedBreakdown,
    rejected,
    feeColumns: detectFeeColumnsFromRows("trading212", rows),
  };
}

function analyzeTrading212(text: string): CsvAnalysisResult {
  return analyzeTrading212FromRows(parseCsvRowsStrict(text).rows);
}

function trading212(text: string): ImportedTx[] {
  return analyzeTrading212(text).transactions;
}

function revolut(text: string): ImportedTx[] {
  return table(text).flatMap((g) => {
    return parseSafely(() => {
      const t = g("type").toUpperCase();
      const rawSymbol = g("ticker").toUpperCase();
      if (!rawSymbol) return [];
      const cur = g("currency") || g("price per share").match(/[A-Z]{3}/)?.[0];
      const tradeCurrency = currency(cur || "USD");
      const resolved = resolveImportedInstrument({
        symbol: rawSymbol,
        name: rawSymbol,
        currency: tradeCurrency,
      });
      const resolvedSymbol = resolved.quoteSymbol;
      const base = {
        symbol: resolvedSymbol,
        ...(resolvedSymbol !== rawSymbol ? { brokerSymbol: rawSymbol } : {}),
        name: rawSymbol,
        assetType: resolved.effectiveType,
        currency: tradeCurrency,
        date: day(g("date")),
        ...sourceIdentity(g("transaction id") || g("id"), "revolut:transaction:", g("date")),
      };
      if (t.includes("DIVIDEND"))
        return [
          {
            ...base,
            kind: "dividend" as TxKind,
            quantity: 1,
            price: toUsd(num(g("total amount")), cur),
            fee: g.sum(/fee|commission|stamp duty|levy|charge/i),
            feeCurrency: currency(g("currency (fee)") || cur || "USD"),
          },
        ];
      const kind: TxKind | null = t.startsWith("BUY")
        ? "buy"
        : t.startsWith("SELL")
          ? "sell"
          : null;
      if (!kind) return [];
      return [
        {
          ...base,
          kind,
          quantity: Math.abs(num(g("quantity"))),
          price: toUsd(num(g("price per share")), cur),
          fee: g.sum(/fee|commission|stamp duty|levy|charge/i),
          feeCurrency: currency(g("currency (fee)") || cur || "USD"),
        },
      ];
    });
  });
}

function ibkr(text: string): ImportedTx[] {
  const rows = parseCsvRows(text);
  const out: ImportedTx[] = [];
  let tradeHead: string[] = [],
    divHead: string[] = [];
  for (const r of rows) {
    if (r[0] === "Trades" && r[1] === "Header") tradeHead = r.map((x) => x.toLowerCase());
    else if (r[0] === "Dividends" && r[1] === "Header") divHead = r.map((x) => x.toLowerCase());
    else if (r[0] === "Trades" && r[1] === "Data" && tradeHead.length) {
      try {
        const g = (k: string) => r[tradeHead.indexOf(k)] ?? "";
        if (g("datadiscriminator") && g("datadiscriminator") !== "Order") continue;
        const qty = num(g("quantity"));
        if (!qty) continue;
        const cat = g("asset category").toLowerCase();
        const rawSymbol = g("symbol").toUpperCase();
        const tradeCurrency = currency(g("currency"));
        const isin = cleanIsin(g("isin"));
        const resolved = resolveImportedInstrument({
          symbol: rawSymbol,
          isin,
          name: g("description") || rawSymbol,
          currency: tradeCurrency,
          declaredType: cat.includes("crypto") ? "crypto" : undefined,
        });
        const resolvedSymbol = resolved.quoteSymbol;
        out.push({
          symbol: resolvedSymbol,
          ...(resolvedSymbol !== rawSymbol ? { brokerSymbol: rawSymbol } : {}),
          ...(isin ? { isin } : {}),
          name: g("description") || rawSymbol,
          assetType: cat.includes("crypto") ? "crypto" : resolved.effectiveType,
          kind: qty > 0 ? "buy" : "sell",
          quantity: Math.abs(qty),
          currency: tradeCurrency,
          price: toUsd(num(g("t. price"))),
          fee: Math.abs(num(g("comm/f"))),
          date: day(g("date/time")),
          ...sourceIdentity(g("trade id") || g("transaction id"), "ibkr:trade:", g("date/time")),
        });
      } catch {
        continue;
      }
    } else if (r[0] === "Dividends" && r[1] === "Data" && divHead.length) {
      try {
        const g = (k: string) => r[divHead.indexOf(k)] ?? "";
        if (g("currency").toLowerCase().startsWith("total")) continue;
        const rawSymbol = (g("description").match(/^([A-Z.]+)\s*\(/)?.[1] ?? "").toUpperCase();
        const isin = cleanIsin(g("description").match(/\(([A-Z]{2}[A-Z0-9]{9}\d)\)/)?.[1]);
        const amt = num(g("amount"));
        if (!rawSymbol || amt <= 0) continue;
        const divCurrency = currency(g("currency"));
        const resolved = resolveImportedInstrument({
          symbol: rawSymbol,
          isin,
          name: rawSymbol,
          currency: divCurrency,
        });
        const resolvedSymbol = resolved.quoteSymbol;
        out.push({
          symbol: resolvedSymbol,
          ...(resolvedSymbol !== rawSymbol ? { brokerSymbol: rawSymbol } : {}),
          ...(isin ? { isin } : {}),
          name: rawSymbol,
          assetType: resolved.effectiveType,
          kind: "dividend",
          quantity: 1,
          currency: divCurrency,
          price: toUsd(amt),
          fee: 0,
          date: day(g("date")),
          ...sourceIdentity(g("transaction id"), "ibkr:dividend:", g("date")),
        });
      } catch {
        continue;
      }
    }
  }
  return out;
}

export function parseBrokerCsv(format: BrokerFormat, text: string): ImportedTx[] {
  const fn = { generic, trading212, ibkr, revolut }[format];
  return fn(stripBom(text)).filter((t) => t.symbol && t.quantity > 0 && t.price > 0);
}

export function rejectedCsvRows(format: BrokerFormat, text: string): CsvRejection[] {
  if (format === "trading212") {
    const analysis = analyzeTrading212(text);
    const body = parseCsvRowsStrict(text).rows.slice(1);
    const excludedAsRejections: CsvRejection[] = analysis.excluded.map((item) => ({
      row: item.row,
      raw: csvRowText(body[item.row - 2] ?? []),
      action: item.action,
      reason: "unsupported_action",
    }));
    return [...excludedAsRejections, ...analysis.rejected].sort((a, b) => a.row - b.row);
  }
  const rows = parseCsvRows(stripBom(text));
  const csvRow = (row: string[]) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");
  const candidates = rows.flatMap((row, index) => {
    if (format === "ibkr") {
      return row[0] === "Trades" || row[0] === "Dividends"
        ? row[1] === "Data"
          ? [{ row, index }]
          : []
        : [];
    }
    return index > 0 ? [{ row, index }] : [];
  });

  return candidates.flatMap(({ row, index }) => {
    const isolatedRows =
      format === "ibkr"
        ? [
            ...rows
              .slice(0, index)
              .filter(
                (candidate) =>
                  (candidate[0] === "Trades" || candidate[0] === "Dividends") &&
                  candidate[1] === "Header",
              ),
            row,
          ]
        : [rows[0] ?? [], row];
    if (parseBrokerCsv(format, isolatedRows.map(csvRow).join("\n")).length) return [];

    const headers =
      format === "ibkr"
        ? (isolatedRows.find((candidate) => candidate[0] === row[0] && candidate[1] === "Header") ??
          [])
        : (rows[0] ?? []);
    const value = (header: string) => {
      const position = headers.findIndex((column) => column.toLowerCase() === header.toLowerCase());
      return position >= 0 ? (row[position] ?? "") : "";
    };
    const action =
      format === "generic"
        ? value("type").toLowerCase()
        : format === "revolut"
          ? value("type").toLowerCase()
          : row[0] === "Trades"
            ? "trade"
            : "dividend";
    const supported =
      format === "generic"
        ? ["buy", "sell", "dividend"].includes(action)
        : format === "revolut"
          ? action.startsWith("buy") || action.startsWith("sell") || action.includes("dividend")
          : row[0] !== "Trades" || !row[2] || row[2] === "Order";
    const symbol =
      format === "generic"
        ? value("symbol")
        : format === "revolut"
          ? value("ticker")
          : row[0] === "Trades"
            ? value("symbol")
            : (value("description").match(/^([A-Z.]+)\s*\(/)?.[1] ?? "");
    return [
      {
        row: index + 1,
        raw: csvRow(row),
        reason: !supported
          ? ("unsupported_action" as const)
          : !symbol.trim()
            ? ("missing_ticker" as const)
            : ("invalid_transaction" as const),
      },
    ];
  });
}

function detectFeeColumnsFromRows(format: BrokerFormat, rows: string[][]): string[] {
  const headers =
    format === "ibkr"
      ? rows.filter((row) => row[1] === "Header").flatMap((row) => row.slice(2))
      : (rows[0] ?? []);
  return [
    ...new Map(
      headers
        .filter((header) => FEE_HEADER_RE.test(header) && !isCurrencyDescriptorHeader(header))
        .map((header) => [header.toLowerCase(), header]),
    ).values(),
  ];
}

export function detectFeeColumns(format: BrokerFormat, text: string): string[] {
  return detectFeeColumnsFromRows(format, parseCsvRows(stripBom(text)));
}

function detectBrokerFormatFromRows(rows: string[][]): BrokerFormat | null {
  if (rows.some((r) => r[0] === "Trades" && r[1] === "Header")) return "ibkr";
  const h = (rows[0] ?? []).map((v) => v.toLowerCase());
  const t212TimeIdx = findTrading212TimeIndex(h);
  if (
    (h.includes("action") &&
      h.includes("price / share") &&
      (h.includes("ticker") || h.includes("no. of shares") || t212TimeIdx >= 0)) ||
    (h.includes("action") &&
      h.includes("no. of shares") &&
      (t212TimeIdx >= 0 || h.includes("isin")))
  ) {
    return "trading212";
  }
  if (h.includes("price per share") && h.includes("type") && h.includes("ticker")) return "revolut";
  const normalized = h.map((header) => header.replace(/[^a-z0-9]+/g, ""));
  const has = (...options: string[]) => options.some((option) => normalized.includes(option));
  if (
    has("date", "datetime", "tradedate", "transactiondate", "transactiondateutc", "time") &&
    has("type", "action", "side", "transactiontype", "activity") &&
    has("symbol", "ticker", "isin", "instrument", "asset", "product") &&
    has("price", "unitprice", "pricepershare", "priceperunit", "executionprice")
  )
    return "generic";
  return null;
}

export function detectBrokerFormat(text: string): BrokerFormat | null {
  return detectBrokerFormatFromRows(parseCsvRows(stripBom(text)));
}

export function analyzeBrokerCsv(format: BrokerFormat, text: string): CsvAnalysisResult {
  if (format === "trading212") return analyzeTrading212(text);
  const rows = parseCsvRows(stripBom(text));
  const transactions = parseBrokerCsv(format, text);
  const rejected = rejectedCsvRows(format, text);
  return {
    format,
    totalRows: transactions.length + rejected.length,
    transactions,
    excluded: [],
    excludedBreakdown: [],
    rejected,
    feeColumns: detectFeeColumnsFromRows(format, rows),
  };
}

export function prepareCsvText(text: string, expectedFormat?: BrokerFormat): CsvAnalysisResult {
  const { rows, unclosedQuote } = parseCsvRowsStrict(text);
  if (unclosedQuote) throw new CsvPrepareError("malformed_csv");
  if (!rows.length) throw new CsvPrepareError("empty_file");

  const headerRow = rows[0] ?? [];
  const lowerHeaders = headerRow.map((h) => h.toLowerCase());
  const detected = detectBrokerFormatFromRows(rows);

  if (detected === "trading212" || (!detected && expectedFormat === "trading212")) {
    const missing = missingTrading212Headers(headerRow);
    if (missing.length > 0 && (detected === "trading212" || hasTrading212Signature(lowerHeaders))) {
      throw new CsvPrepareError("missing_t212_headers", { missingHeaders: missing });
    }
  }

  if (!detected) throw new CsvPrepareError("unsupported_format");

  const dataRowCount =
    detected === "ibkr"
      ? rows.filter((r) => (r[0] === "Trades" || r[0] === "Dividends") && r[1] === "Data").length
      : Math.max(0, rows.length - 1);

  if (dataRowCount === 0) throw new CsvPrepareError("empty_file");
  if (dataRowCount > MAX_CSV_ROWS) throw new CsvPrepareError("too_many_rows");

  if (detected === "trading212") return analyzeTrading212FromRows(rows);
  return analyzeBrokerCsv(detected, text);
}

export async function prepareCsvFile(
  file: File,
  expectedFormat?: BrokerFormat,
): Promise<CsvAnalysisResult> {
  const text = await decodeCsvFile(file);
  return prepareCsvText(text, expectedFormat);
}

/** All import entry points compare only the selected brokerage account. */
export function existingImportTransactions(
  transactions: Transaction[],
  assets: {
    id: string;
    symbol: string;
    name?: string;
    type?: AssetType;
    isin?: string;
    quoteCurrency?: string;
  }[],
  brokerId: string,
) {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  return transactions
    .filter((transaction) => transaction.brokerId === brokerId)
    .map((transaction) => {
      const asset = assetById.get(transaction.assetId);
      return {
        ...transaction,
        symbol: asset?.symbol ?? "",
        ...(asset?.name ? { name: asset.name } : {}),
        ...(asset?.type ? { assetType: asset.type } : {}),
        ...(asset?.isin ? { isin: asset.isin } : {}),
        ...(asset?.quoteCurrency ? { currency: asset.quoteCurrency } : {}),
      };
    });
}

type ComparisonTransaction = Pick<
  ImportedTx,
  "symbol" | "date" | "quantity" | "price" | "fee" | "sourceTransactionId" | "sourceExecutedAt"
> & {
  kind: string;
  name?: string | undefined;
  isin?: string | undefined;
  assetType?: AssetType | undefined;
  currency?: string | undefined;
};

/** Provider IDs are authoritative; legacy matches remain reviewable possible duplicates. */
export function splitDuplicates(
  rows: ImportedTx[],
  existing: ComparisonTransaction[],
  normalizedRows: ImportedTx[] = rows,
) {
  if (rows.length !== normalizedRows.length)
    throw new Error("Duplicate comparison rows must match the imported rows.");
  const key = (r: ComparisonTransaction) => {
    const id = r.symbol.trim()
      ? canonicalIdentityKey({
          symbol: r.symbol,
          name: r.name,
          isin: r.isin,
          type: r.assetType,
          currency: r.currency,
        })
      : "";
    return `${id}|${r.kind}|${r.date.slice(0, 10)}|${r.kind === "dividend" ? 1 : r.quantity.toFixed(8)}|${r.price.toFixed(8)}|${(r.fee ?? 0).toFixed(8)}`;
  };
  const seen = new Map<string, ComparisonTransaction[]>();
  const sourceIds = new Set<string>();
  const remember = (row: ComparisonTransaction) => {
    const k = key(row);
    const matches = seen.get(k) ?? [];
    matches.push(row);
    seen.set(k, matches);
    if (row.sourceTransactionId) sourceIds.add(row.sourceTransactionId);
  };
  existing.forEach(remember);
  const fresh: ImportedTx[] = [];
  const duplicates: ImportedTx[] = [];
  for (const [index, row] of rows.entries()) {
    const comparison = {
      ...row,
      price: normalizedRows[index]!.price,
      fee: normalizedRows[index]!.fee,
    };
    const duplicate =
      (row.sourceTransactionId && sourceIds.has(row.sourceTransactionId)) ||
      (seen.get(key(comparison)) ?? []).some((candidate) => {
        if (row.sourceTransactionId && candidate.sourceTransactionId) return false;
        return (
          !row.sourceExecutedAt ||
          !candidate.sourceExecutedAt ||
          row.sourceExecutedAt === candidate.sourceExecutedAt
        );
      });
    (duplicate ? duplicates : fresh).push(row);
    remember(comparison);
  }
  return { fresh, duplicates };
}

export function rowsForImport(
  fresh: ImportedTx[],
  duplicates: ImportedTx[],
  includeDuplicateIndexes: number[],
): ImportedTx[] {
  const included = new Set(includeDuplicateIndexes);
  return [...fresh, ...duplicates.filter((_, index) => included.has(index))];
}
