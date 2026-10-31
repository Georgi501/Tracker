import type { AssetType, TxKind } from "./portfolio";
import { CRYPTO_SYMBOLS } from "./crypto-assets";

export type BrokerFormat = "generic" | "trading212" | "ibkr" | "revolut";
export const BROKER_FORMATS: { id: BrokerFormat; label: string }[] = [
  { id: "generic", label: "Generic template" },
  { id: "trading212", label: "Trading 212" },
  { id: "ibkr", label: "Interactive Brokers" },
  { id: "revolut", label: "Revolut" },
];

export interface ImportedTx {
  symbol: string;
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

export interface CsvRejection {
  row: number;
  raw: string;
  reason: "unsupported_action" | "missing_ticker" | "invalid_transaction";
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
  if (!["USD", "EUR", "BGN", "GBX", "GBP"].includes(c))
    throw new Error(`Unsupported currency: ${c}`);
  return c;
};

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === ";") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
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
const num = (s: string) => {
  let v = s.replace(/[^\d.,-]/g, "");
  if (v.includes(",") && v.includes("."))
    v =
      v.lastIndexOf(",") > v.lastIndexOf(".")
        ? v.replace(/\./g, "").replace(",", ".")
        : v.replace(/,/g, "");
  else if (v.includes(",")) v = v.replace(",", ".");
  return Number(v) || 0;
};
const day = (s: string) => {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = s.match(/(\d{2})[./](\d{2})[./](\d{4})/);
  if (d) return `${d[3]}-${d[2]}-${d[1]}`;
  throw new Error(`Invalid transaction date: ${s}`);
};
const CRYPTO = new Set([...CRYPTO_SYMBOLS, "MATIC"]);
const guessType = (sym: string): AssetType => (CRYPTO.has(sym.toUpperCase()) ? "crypto" : "stock");
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
    name: ["name", "description", "company", "securityname"],
    asset_type: ["assettype", "securitytype"],
    quantity: ["quantity", "qty", "shares", "units", "noofshares"],
    price: ["price", "unitprice", "pricepershare", "priceperunit", "executionprice"],
    currency: ["currency", "pricecurrency", "settlementcurrency"],
    fee: ["fee", "fees", "commission", "transactionfee", "commissionamount"],
  };
  const value = (row: string[], key: string) => {
    const index = headers.findIndex((header) => aliases[key]?.includes(header));
    return index >= 0 ? (row[index] ?? "") : "";
  };
  return rows.slice(1).flatMap((row) => {
    return parseSafely(() => {
      const kind = value(row, "type").toLowerCase() as TxKind;
      if (!["buy", "sell", "dividend"].includes(kind)) return [];
      const symbol = value(row, "symbol").toUpperCase();
      const at = (value(row, "asset_type") || guessType(symbol)) as AssetType;
      const cur = currency(value(row, "currency"));
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
      return [
        {
          symbol,
          name: value(row, "name") || symbol,
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

function trading212(text: string): ImportedTx[] {
  return table(text).flatMap((g) => {
    return parseSafely(() => {
      const a = g("action").toLowerCase();
      const symbol = g("ticker").toUpperCase();
      if (!symbol) return [];
      const base = {
        symbol,
        name: g("name") || symbol,
        assetType: "stock" as AssetType,
        date: day(g("time")),
      };
      if (a.includes("dividend")) {
        const total = num(g("total")) || num(g("no. of shares")) * num(g("price / share"));
        return [
          {
            ...base,
            kind: "dividend" as TxKind,
            quantity: 1,
            currency: currency(g("currency (total)") || g("currency (price / share)")),
            price: toUsd(total),
            fee: g.sum(/fee|commission|comm\/?f|stamp duty|levy|charge/i),
            feeCurrency: currency(
              g("currency (transaction fee)") || g("currency (price / share)") || "USD",
            ),
          },
        ];
      }
      const kind: TxKind | null = a.includes("buy") ? "buy" : a.includes("sell") ? "sell" : null;
      if (!kind) return [];
      return [
        {
          ...base,
          kind,
          currency: currency(g("currency (price / share)")),
          quantity: num(g("no. of shares")),
          price: toUsd(num(g("price / share")), g("currency (price / share)")),
          fee: g.sum(/fee|commission|comm\/?f|stamp duty|levy|charge/i),
          feeCurrency: currency(
            g("currency (transaction fee)") || g("currency (price / share)") || "USD",
          ),
        },
      ];
    });
  });
}

function revolut(text: string): ImportedTx[] {
  return table(text).flatMap((g) => {
    return parseSafely(() => {
      const t = g("type").toUpperCase();
      const symbol = g("ticker").toUpperCase();
      if (!symbol) return [];
      const cur = g("currency") || g("price per share").match(/[A-Z]{3}/)?.[0];
      const base = {
        symbol,
        name: symbol,
        assetType: guessType(symbol),
        currency: currency(cur || "USD"),
        date: day(g("date")),
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
        const symbol = g("symbol").toUpperCase();
        out.push({
          symbol,
          name: symbol,
          assetType: cat.includes("crypto") ? "crypto" : "stock",
          kind: qty > 0 ? "buy" : "sell",
          quantity: Math.abs(qty),
          currency: currency(g("currency")),
          price: toUsd(num(g("t. price"))),
          fee: Math.abs(num(g("comm/f"))),
          date: day(g("date/time")),
        });
      } catch {
        continue;
      }
    } else if (r[0] === "Dividends" && r[1] === "Data" && divHead.length) {
      try {
        const g = (k: string) => r[divHead.indexOf(k)] ?? "";
        if (g("currency").toLowerCase().startsWith("total")) continue;
        const symbol = (g("description").match(/^([A-Z.]+)\s*\(/)?.[1] ?? "").toUpperCase();
        const amt = num(g("amount"));
        if (!symbol || amt <= 0) continue;
        out.push({
          symbol,
          name: symbol,
          assetType: "stock",
          kind: "dividend",
          quantity: 1,
          currency: currency(g("currency")),
          price: toUsd(amt),
          fee: 0,
          date: day(g("date")),
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
  return fn(text.replace(/^\uFEFF/, "")).filter((t) => t.symbol && t.quantity > 0 && t.price > 0);
}

export function rejectedCsvRows(format: BrokerFormat, text: string): CsvRejection[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
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
        : format === "trading212"
          ? value("action").toLowerCase()
          : format === "revolut"
            ? value("type").toLowerCase()
            : row[0] === "Trades"
              ? "trade"
              : "dividend";
    const supported =
      format === "generic"
        ? ["buy", "sell", "dividend"].includes(action)
        : format === "trading212"
          ? action.includes("buy") || action.includes("sell") || action.includes("dividend")
          : format === "revolut"
            ? action.startsWith("buy") || action.startsWith("sell") || action.includes("dividend")
            : row[0] !== "Trades" || !row[2] || row[2] === "Order";
    const symbol =
      format === "generic"
        ? value("symbol")
        : format === "trading212" || format === "revolut"
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

export function detectFeeColumns(format: BrokerFormat, text: string): string[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  const headers =
    format === "ibkr"
      ? rows.filter((row) => row[1] === "Header").flatMap((row) => row.slice(2))
      : (rows[0] ?? []);
  return [
    ...new Map(
      headers
        .filter((header) => /fee|commission|comm\/?f|stamp duty|levy|charge/i.test(header))
        .map((header) => [header.toLowerCase(), header]),
    ).values(),
  ];
}

export const brokerLimit = (isPro: boolean) => (isPro ? 5 : 1);

export function detectBrokerFormat(text: string): BrokerFormat | null {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (rows.some((r) => r[0] === "Trades" && r[1] === "Header")) return "ibkr";
  const h = (rows[0] ?? []).map((v) => v.toLowerCase());
  if (h.includes("action") && h.includes("price / share") && h.includes("ticker"))
    return "trading212";
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

/** Split parsed rows into new vs. existing transactions using the converted USD unit/total price. */
export function splitDuplicates(
  rows: ImportedTx[],
  existing: {
    symbol: string;
    kind: string;
    date: string;
    quantity: number;
    price: number;
    fee?: number;
  }[],
  normalizedRows: ImportedTx[] = rows,
) {
  if (rows.length !== normalizedRows.length)
    throw new Error("Duplicate comparison rows must match the imported rows.");
  const key = (s: string, k: string, d: string, q: number, p: number, fee = 0) =>
    `${s.toUpperCase()}|${k}|${d.slice(0, 10)}|${k === "dividend" ? 1 : q.toFixed(8)}|${p.toFixed(8)}|${fee.toFixed(8)}`;
  const seen = new Set(
    existing.map((e) => key(e.symbol, e.kind, e.date, e.quantity, e.price, e.fee ?? 0)),
  );
  const fresh: ImportedTx[] = [];
  const duplicates: ImportedTx[] = [];
  for (const [index, r] of rows.entries()) {
    const normalized = normalizedRows[index]!;
    const k = key(r.symbol, r.kind, r.date, r.quantity, normalized.price, normalized.fee);
    (seen.has(k) ? duplicates : fresh).push(r);
    seen.add(k);
  }
  return { fresh, duplicates };
}
