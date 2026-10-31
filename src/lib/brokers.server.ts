import { z } from "zod";
import type { ImportedTx } from "./csv-import";

const T212_BASE = "https://live.trading212.com/api/v0";
const IBKR_BASE = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";
const ALLOWED_CURRENCIES = new Set(["USD", "EUR", "BGN", "GBX", "GBP"]);
const t212CredentialsSchema = z.object({
  apiKey: z.string().trim().min(8).max(200),
  apiSecret: z.string().trim().min(8).max(300),
});
const ibkrCredentialsSchema = z.object({
  token: z.string().trim().min(8).max(200),
  queryId: z
    .string()
    .trim()
    .regex(/^\d{1,20}$/),
});

export type DirectBroker = "ibkr" | "trading212";
export type BrokerCredentials =
  z.infer<typeof t212CredentialsSchema> | z.infer<typeof ibkrCredentialsSchema>;

const t212OrderSchema = z.object({
  fill: z
    .object({
      id: z.number().int().positive(),
      filledAt: z.string(),
      price: z.number().positive(),
      quantity: z.number().positive(),
      type: z.string(),
      walletImpact: z
        .object({
          taxes: z
            .array(z.object({ currency: z.string(), quantity: z.number() }))
            .nullable()
            .optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  order: z.object({
    id: z.number().int().positive(),
    side: z.enum(["BUY", "SELL"]),
    instrument: z
      .object({
        currency: z.string(),
        name: z.string(),
        ticker: z.string(),
      })
      .nullable()
      .optional(),
    ticker: z.string().optional(),
  }),
});

const t212DividendSchema = z.object({
  amount: z.number(),
  currency: z.string(),
  paidOn: z.string(),
  reference: z.union([z.string(), z.number()]),
  instrument: z
    .object({ name: z.string().optional(), ticker: z.string().optional() })
    .nullable()
    .optional(),
  ticker: z.string().optional(),
});

function assertCurrency(currency: string): string {
  const normalized = currency.toUpperCase();
  if (!ALLOWED_CURRENCIES.has(normalized))
    throw new Error(
      `Unsupported broker currency ${currency}; import was stopped to avoid wrong FX.`,
    );
  return normalized;
}

function transactionDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new Error("Broker returned an invalid transaction date");
  return date.toISOString().slice(0, 10);
}

function basicAuth(key: string, secret: string) {
  return `Basic ${btoa(`${key}:${secret}`)}`;
}

async function t212Request(
  credentials: z.infer<typeof t212CredentialsSchema>,
  path: string,
): Promise<unknown> {
  const response = await fetch(new URL(path, `${T212_BASE}/`), {
    headers: { Authorization: basicAuth(credentials.apiKey, credentials.apiSecret) },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Trading 212 rejected the API credentials.");
    if (response.status === 403)
      throw new Error("Trading 212 API key is missing the required read-only permissions.");
    if (response.status === 429)
      throw new Error("Trading 212 rate limit reached; try again later.");
    throw new Error(`Trading 212 API request failed (${response.status}).`);
  }
  return response.json();
}

async function t212Pages<T>(
  credentials: z.infer<typeof t212CredentialsSchema>,
  path: string,
  schema: z.ZodType<T>,
): Promise<T[]> {
  const output: T[] = [];
  let nextPath: string | null = `/api/v0/${path}?limit=50`;
  for (let page = 0; nextPath && page < 200; page++) {
    if (!nextPath.startsWith("/api/v0/"))
      throw new Error("Trading 212 returned an invalid page URL.");
    const result = z
      .object({ items: z.array(z.unknown()), nextPagePath: z.string().nullable().optional() })
      .parse(await t212Request(credentials, nextPath.slice("/api/v0/".length)));
    output.push(...result.items.map((item) => schema.parse(item)));
    nextPath = result.nextPagePath ?? null;
  }
  if (nextPath)
    throw new Error("Trading 212 history exceeds the safe sync limit; narrow the export range.");
  return output;
}

export function parseT212Orders(orders: z.infer<typeof t212OrderSchema>[]): ImportedTx[] {
  return orders.flatMap((entry) => {
    const fill = entry.fill;
    if (!fill || fill.type !== "TRADE") return [];
    const instrument = entry.order.instrument;
    const symbol = instrument?.ticker ?? entry.order.ticker;
    if (!symbol) return [];
    const taxes = fill.walletImpact?.taxes ?? [];
    const taxCurrencies = new Set(taxes.map((tax) => tax.currency.toUpperCase()));
    if (taxCurrencies.size > 1)
      throw new Error(
        `Trading 212 returned fees in multiple currencies for ${symbol}; sync stopped.`,
      );
    const feeCurrency = taxes[0]?.currency;
    const fees = taxes.reduce((sum, tax) => sum + Math.abs(tax.quantity), 0);
    return [
      {
        sourceTransactionId: `t212:fill:${fill.id}`,
        symbol,
        name: instrument?.name ?? symbol,
        assetType: "stock",
        kind: entry.order.side === "BUY" ? "buy" : "sell",
        quantity: fill.quantity,
        price: fill.price,
        ...(fees > 0 ? { fee: fees, feeCurrency: assertCurrency(feeCurrency ?? "") } : {}),
        date: transactionDate(fill.filledAt),
        currency: assertCurrency(instrument?.currency ?? ""),
      },
    ];
  });
}

export function parseT212Dividends(dividends: z.infer<typeof t212DividendSchema>[]): ImportedTx[] {
  return dividends.flatMap((item) => {
    const symbol = item.instrument?.ticker ?? item.ticker;
    if (!symbol || !Number.isFinite(item.amount) || item.amount <= 0) return [];
    return [
      {
        sourceTransactionId: `t212:dividend:${item.reference}`,
        symbol,
        name: item.instrument?.name ?? symbol,
        assetType: "stock",
        kind: "dividend",
        quantity: 1,
        price: item.amount,
        date: transactionDate(item.paidOn),
        currency: assertCurrency(item.currency),
      },
    ];
  });
}

function xmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function xmlTagText(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`, "i"));
  return match?.[1] ? xmlEntities(match[1].trim()) : null;
}

function parseFlexAttributes(xml: string, tag: string) {
  const out: Record<string, string>[] = [];
  const expression = new RegExp(`<${tag}\\b([^>]*)\\/?\\s*>`, "gi");
  for (const match of xml.matchAll(expression)) {
    const attributes: Record<string, string> = {};
    for (const item of (match[1] ?? "").matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g))
      attributes[item[1]!] = xmlEntities(item[2]!);
    out.push(attributes);
  }
  return out;
}

function flexDate(value: string | undefined) {
  if (!value) return null;
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

export function parseFlexReport(xml: string): ImportedTx[] {
  const status = xmlTagText(xml, "Status");
  if (status && status !== "Success") {
    const message = xmlTagText(xml, "ErrorMessage");
    throw new Error(message ? `IBKR Flex report failed: ${message}` : "IBKR Flex report failed.");
  }
  const rows: ImportedTx[] = [];
  for (const [index, trade] of parseFlexAttributes(xml, "Trade").entries()) {
    const quantity = Number(trade["quantity"]);
    const price = Number(trade["tradePrice"]);
    const side = trade["buySell"]?.toUpperCase();
    const date = flexDate(trade["dateTime"]);
    const symbol = trade["symbol"]?.trim().toUpperCase();
    const id = trade["transactionID"] ?? trade["tradeID"] ?? trade["execID"];
    if (
      !symbol ||
      !id ||
      !date ||
      !Number.isFinite(quantity) ||
      quantity === 0 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      (side !== "BUY" && side !== "SELL")
    )
      continue;
    rows.push({
      sourceTransactionId: `ibkr:trade:${id || index}`,
      symbol,
      name: trade["description"]?.trim() || symbol,
      assetType: "stock",
      kind: side === "BUY" ? "buy" : "sell",
      quantity: Math.abs(quantity),
      price,
      fee: Math.abs(Number(trade["ibCommission"]) || 0),
      date,
      currency: assertCurrency(trade["currency"] ?? ""),
    });
  }
  for (const [index, item] of parseFlexAttributes(xml, "CashTransaction").entries()) {
    const type = item["type"]?.toLowerCase() ?? "";
    if (!type.includes("dividend")) continue;
    const amount = Number(item["amount"]);
    const date = flexDate(item["dateTime"]);
    const symbol = item["symbol"]?.trim().toUpperCase();
    const id = item["transactionID"] ?? item["tradeID"];
    if (!symbol || !id || !date || !Number.isFinite(amount) || amount <= 0) continue;
    rows.push({
      sourceTransactionId: `ibkr:dividend:${id || index}`,
      symbol,
      name: item["description"]?.trim() || symbol,
      assetType: "stock",
      kind: "dividend",
      quantity: 1,
      price: amount,
      date,
      currency: assertCurrency(item["currency"] ?? ""),
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

async function ibkrRequest(token: string, query: Record<string, string>) {
  const url = new URL(IBKR_BASE);
  url.pathname += `/${query["action"]}`;
  for (const [key, value] of Object.entries(query))
    if (key !== "action") url.searchParams.set(key, value);
  url.searchParams.set("t", token);
  url.searchParams.set("v", "3");
  return fetch(url, {
    headers: { "User-Agent": "Capispot/1.0 (read-only portfolio import)" },
    signal: AbortSignal.timeout(20_000),
  });
}

async function fetchFlexReport(credentials: z.infer<typeof ibkrCredentialsSchema>) {
  const initResponse = await ibkrRequest(credentials.token, {
    action: "SendRequest",
    q: credentials.queryId,
  });
  const initXml = await initResponse.text();
  if (!initResponse.ok) throw new Error(`IBKR Flex request failed (${initResponse.status}).`);
  if (xmlTagText(initXml, "Status") !== "Success") {
    const message = xmlTagText(initXml, "ErrorMessage");
    throw new Error(message ? `IBKR Flex request failed: ${message}` : "IBKR Flex request failed.");
  }
  const reference = xmlTagText(initXml, "ReferenceCode");
  if (!reference || !/^\d+$/.test(reference))
    throw new Error("IBKR returned an invalid report reference.");
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 1200));
    const response = await ibkrRequest(credentials.token, {
      action: "GetStatement",
      q: reference,
    });
    const xml = await response.text();
    if (!response.ok) throw new Error(`IBKR Flex report download failed (${response.status}).`);
    if (xmlTagText(xml, "Status") === "Success" && xml.includes("<FlexStatement")) return xml;
    const errorCode = xmlTagText(xml, "ErrorCode");
    if (errorCode && errorCode !== "1019") {
      const message = xmlTagText(xml, "ErrorMessage");
      throw new Error(message ? `IBKR Flex report failed: ${message}` : "IBKR Flex report failed.");
    }
  }
  throw new Error("IBKR Flex report is still being generated. Try syncing again shortly.");
}

export function validateBrokerCredentials(
  provider: DirectBroker,
  input: unknown,
): BrokerCredentials {
  return provider === "trading212"
    ? t212CredentialsSchema.parse(input)
    : ibkrCredentialsSchema.parse(input);
}

export async function fetchDirectBrokerTransactions(
  provider: DirectBroker,
  input: unknown,
): Promise<ImportedTx[]> {
  const credentials = validateBrokerCredentials(provider, input);
  if (provider === "trading212") {
    const typed = t212CredentialsSchema.parse(credentials);
    const [orders, dividends] = await Promise.all([
      t212Pages(typed, "equity/history/orders", t212OrderSchema),
      t212Pages(typed, "equity/history/dividends", t212DividendSchema),
    ]);
    return [...parseT212Orders(orders), ...parseT212Dividends(dividends)].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
  const typed = ibkrCredentialsSchema.parse(credentials);
  return parseFlexReport(await fetchFlexReport(typed));
}

export async function verifyTrading212Credentials(input: unknown) {
  const credentials = t212CredentialsSchema.parse(input);
  await t212Request(credentials, "/equity/account/summary");
}
