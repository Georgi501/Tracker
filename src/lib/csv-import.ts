import type { AssetType, TxKind } from "./portfolio";

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
  date: string; // YYYY-MM-DD
  currency?: string; // original price currency; converted on server before storing
}

export const GENERIC_TEMPLATE =
  "date,type,symbol,name,asset_type,quantity,price,currency\n" +
  "2024-01-15,buy,AAPL,Apple Inc.,stock,10,185.20,USD\n" +
  "2024-03-01,buy,BTC,Bitcoin,crypto,0.05,62000,USD\n" +
  "2024-05-16,dividend,AAPL,Apple Inc.,stock,1,2.50,USD\n";

const toUsd = (v: number, _cur?: string) => v;
const currency = (cur: string) => {
  const c = (cur || "USD").trim().toUpperCase();
  if (!["USD", "EUR", "BGN", "GBX", "GBP"].includes(c)) throw new Error(`Unsupported currency: ${c}`);
  return c;
};

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === ";") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
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
  return body.map((r) => (k: string) => {
    const i = h.indexOf(k.toLowerCase());
    return i >= 0 ? (r[i] ?? "") : "";
  });
}
const num = (s: string) => {
  let v = s.replace(/[^\d.,\-]/g, "");
  if (v.includes(",") && v.includes(".")) v = v.lastIndexOf(",") > v.lastIndexOf(".") ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "");
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
const CRYPTO = new Set(["BTC", "ETH", "SOL", "ADA", "XRP", "DOT", "DOGE", "LTC", "BNB", "AVAX", "LINK", "MATIC"]);
const guessType = (sym: string): AssetType => (CRYPTO.has(sym.toUpperCase()) ? "crypto" : "stock");

function generic(text: string): ImportedTx[] {
  return table(text).flatMap((g) => {
    const kind = g("type").toLowerCase() as TxKind;
    if (!["buy", "sell", "dividend"].includes(kind)) return [];
    const symbol = g("symbol").toUpperCase();
    const at = (g("asset_type") || guessType(symbol)) as AssetType;
    return [{ symbol, name: g("name") || symbol, assetType: at, kind,
      quantity: kind === "dividend" ? 1 : num(g("quantity")),
      price: toUsd(num(g("price")) * (kind === "dividend" ? Math.max(num(g("quantity")), 1) : 1), g("currency")),
      date: day(g("date")), currency: currency(g("currency")) }];
  });
}

function trading212(text: string): ImportedTx[] {
  return table(text).flatMap((g) => {
    const a = g("action").toLowerCase();
    const symbol = g("ticker").toUpperCase();
    if (!symbol) return [];
    const base = { symbol, name: g("name") || symbol, assetType: "stock" as AssetType, date: day(g("time")) };
    if (a.includes("dividend")) {
      const total = num(g("total")) || num(g("no. of shares")) * num(g("price / share"));
      return [{ ...base, kind: "dividend" as TxKind, quantity: 1, currency: currency(g("currency (total)") || g("currency (price / share)")), price: toUsd(total) }];
    }
    const kind: TxKind | null = a.includes("buy") ? "buy" : a.includes("sell") ? "sell" : null;
    if (!kind) return [];
    return [{ ...base, kind, currency: currency(g("currency (price / share)")), quantity: num(g("no. of shares")), price: toUsd(num(g("price / share")), g("currency (price / share)")) }];
  });
}

function revolut(text: string): ImportedTx[] {
  return table(text).flatMap((g) => {
    const t = g("type").toUpperCase();
    const symbol = g("ticker").toUpperCase();
    if (!symbol) return [];
    const cur = g("currency") || g("price per share").match(/[A-Z]{3}/)?.[0];
    const base = { symbol, name: symbol, assetType: guessType(symbol), currency: currency(cur || "USD"), date: day(g("date")) };
    if (t.includes("DIVIDEND")) return [{ ...base, kind: "dividend" as TxKind, quantity: 1, price: toUsd(num(g("total amount")), cur) }];
    const kind: TxKind | null = t.startsWith("BUY") ? "buy" : t.startsWith("SELL") ? "sell" : null;
    if (!kind) return [];
    return [{ ...base, kind, quantity: Math.abs(num(g("quantity"))), price: toUsd(num(g("price per share")), cur) }];
  });
}

function ibkr(text: string): ImportedTx[] {
  const rows = parseCsvRows(text);
  const out: ImportedTx[] = [];
  let tradeHead: string[] = [], divHead: string[] = [];
  for (const r of rows) {
    if (r[0] === "Trades" && r[1] === "Header") tradeHead = r.map((x) => x.toLowerCase());
    else if (r[0] === "Dividends" && r[1] === "Header") divHead = r.map((x) => x.toLowerCase());
    else if (r[0] === "Trades" && r[1] === "Data" && tradeHead.length) {
      const g = (k: string) => r[tradeHead.indexOf(k)] ?? "";
      if (g("datadiscriminator") && g("datadiscriminator") !== "Order") continue;
      const qty = num(g("quantity"));
      if (!qty) continue;
      const cat = g("asset category").toLowerCase();
      const symbol = g("symbol").toUpperCase();
      out.push({ symbol, name: symbol, assetType: cat.includes("crypto") ? "crypto" : "stock",
        kind: qty > 0 ? "buy" : "sell", quantity: Math.abs(qty),
        currency: currency(g("currency")), price: toUsd(num(g("t. price"))), date: day(g("date/time")) });
    } else if (r[0] === "Dividends" && r[1] === "Data" && divHead.length) {
      const g = (k: string) => r[divHead.indexOf(k)] ?? "";
      if (g("currency").toLowerCase().startsWith("total")) continue;
      const symbol = (g("description").match(/^([A-Z.]+)\s*\(/)?.[1] ?? "").toUpperCase();
      const amt = num(g("amount"));
      if (!symbol || amt <= 0) continue;
      out.push({ symbol, name: symbol, assetType: "stock", kind: "dividend", quantity: 1, currency: currency(g("currency")), price: toUsd(amt), date: day(g("date")) });
    }
  }
  return out;
}

export function parseBrokerCsv(format: BrokerFormat, text: string): ImportedTx[] {
  const fn = { generic, trading212, ibkr, revolut }[format];
  return fn(text.replace(/^\uFEFF/, "")).filter((t) => t.symbol && t.quantity > 0 && t.price > 0);
}

export const brokerLimit = (isPro: boolean) => (isPro ? 4 : 1);

export function detectBrokerFormat(text: string): BrokerFormat | null {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (rows.some((r) => r[0] === "Trades" && r[1] === "Header")) return "ibkr";
  const h = (rows[0] ?? []).map((v) => v.toLowerCase());
  if (h.includes("action") && h.includes("price / share") && h.includes("ticker")) return "trading212";
  if (h.includes("price per share") && h.includes("type") && h.includes("ticker")) return "revolut";
  if (["date", "type", "symbol", "price"].every((v) => h.includes(v))) return "generic";
  return null;
}
